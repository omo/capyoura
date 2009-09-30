#!/usr/bin/env python
#
# Copyright 2009 MORITA Hajime
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#

import os
import logging
import time
import datetime
import urlparse
import wsgiref.handlers

from django.utils import simplejson
from google.appengine.api import users
from google.appengine.ext import webapp
from google.appengine.ext.webapp import template
from google.appengine.ext import db
from google.appengine.ext.webapp.util import login_required

class RedirectMixin(object):

  def redirect_to_dashboard(self):
    self.redirect("/dashboard")

  def redirect_to_welcome(self):
    self.redirect("/")

  def redirect_to_logout_welcome(self):
    self.redirect(users.create_logout_url("/"))


class ValidationError(Exception):

  def __init__(self, msg):
    Exception.__init__(self, msg)


# just for track first login...
class Profile(db.Model):
  user  = db.UserProperty(required=True)

class Cap(db.Model):
  owner  = db.UserProperty(required=True)
  site = db.StringProperty(required=True)
  limit  = db.IntegerProperty(required=True)
  timer  = db.IntegerProperty()
  visits = db.ListProperty(datetime.datetime, required=True)

  def visit(self):
    now = datetime.datetime.now()
    self.visits = self.fresh_visits + [now]
    self.put()

  def unvisit(self):
    self.visits = []
    self.put()

  def addict(self):
    self.limit = self.limit + self.limit_step
    self.put()

  def restrict(self):
    self.limit = max([0, self.limit - self.limit_step])
    self.put()

  def addict_timer(self):
    self.timer = (self.timer or 0) + self.timer_step
    self.put()

  def restrict_timer(self):
    self.timer = max([0, (self.timer or 0) - self.timer_step])
    if not self.timer:
      self.timer = None
    self.put()

  @property
  def timer_step(self):
    return self.compute_step(self.timer or 0)

  @property
  def limit_step(self):
    return self.compute_step(self.limit)

  def compute_step(self, num):
    if num < 20:
      return 1
    elif num < 200:
      return 10
    else:
      return 100
    
  @property
  def fresh_visits(self):
    now = datetime.datetime.now()
    yesterday = now - VISIT_LIFETIME
    return [i for i in self.visits if yesterday < i]

  @property
  def visit_count(self):
    return len(self.visits)

  @property
  def fresh_visit_count(self):
    return len(self.fresh_visits)

  @property
  def visit_seconds(self):
    return [int(time.mktime(t.timetuple())) for t in self.visits]

  def to_plain(self):
    return { "site": self.site, "visits": self.visit_seconds, 
             "limit": self.limit, "timer": (self.timer or 0) }

  @property
  def exceeded(self):
    return self.limit <= self.visit_count
  

LARGE_ENOUGH_TO_FETCH = 100
VISIT_LIFETIME = datetime.timedelta(days=1)

class PageHandler(webapp.RequestHandler):

  def template_vars(self, tomerge=None):
    vars = {
      "user": users.get_current_user(),
      "login_url": users.create_login_url(self.request.uri),
      "logout_url": users.create_logout_url("/"),
      "crx_url": "/releases/capyoura.crx"
    }

    if tomerge:
      vars.update(tomerge)
    return vars


class WelcomeHandler(PageHandler, RedirectMixin):

  @property
  def template_path(self):
    return os.path.join(os.path.dirname(__file__), 'templates/welcome.html')

  def get(self):
    if users.get_current_user():
      self.redirect_to_dashboard()
    else:
      self.response.out.write(template.render(self.template_path,
                                              self.template_vars()))


class DashboardHandler(PageHandler, RedirectMixin):

  @login_required
  def get(self):
    user = users.get_current_user()
    self.ensure_profile(user)
    caps = Cap.all().filter('owner =', user).fetch(LARGE_ENOUGH_TO_FETCH)
    self.response.out.write(template.render(self.template_path, 
                                            self.template_vars({"caps": caps})))
  def post(self):
    try:
      if not users.get_current_user():
        raise ValidationError("Should login first.")
      if self.request.get("addnew"):
        self.add_new()
        self.redirect_to_dashboard()
      elif self.request.get("delete"):
        self.delete_one()
        self.redirect_to_dashboard()
      elif self.request.get("unvisit"):
        self.unvisit_one()
        self.redirect_to_dashboard()
      elif self.request.get("restrict"):
        self.restrict_one()
        self.redirect_to_dashboard()
      elif self.request.get("addict"):
        self.addict_one()
        self.redirect_to_dashboard()
      elif self.request.get("restrict_timer"):
        self.restrict_timer_one()
        self.redirect_to_dashboard()
      elif self.request.get("addict_timer"):
        self.addict_timer_one()
        self.redirect_to_dashboard()
      else:
        raise ValidationError("Unknown post request")
    except ValidationError, e:
      self.response.out.write(template.render(self.validation_error_template_path,
                                              self.template_vars({"message": str(e),
                                                                  "backlink": self.request.uri})))

  @property
  def template_path(self):
    return os.path.join(os.path.dirname(__file__), 'templates/dashboard.html')

  @property
  def validation_error_template_path(self):
    return os.path.join(os.path.dirname(__file__), 'templates/validation_error.html')

  def ensure_profile(self, user):
    if 0 < Profile.all().filter("user =", user).count():
      return
    Profile(user=user).put()
    Cap(owner=user, site="twitter.com", limit=20).put() # just for explanation

  def find_one(self):
    owner = users.get_current_user()
    key   = self.request.get("key")
    if not key:
      raise ValidationError("Key to delete is not given")
    got = db.get(key)
    if not got:
      raise ValidationError("Caps for %s is not found" % key)
    return got

  def delete_one(self):
    self.find_one().delete()

  def addict_one(self):
    self.find_one().addict()

  def restrict_one(self):
    self.find_one().restrict()

  def addict_timer_one(self):
    self.find_one().addict_timer()

  def restrict_timer_one(self):
    self.find_one().restrict_timer()

  def unvisit_one(self):
    self.find_one().unvisit()

  def add_new(self):
    owner  = users.get_current_user()
    site = self.request.get("new_site")
    if not site:
      raise ValidationError("Site is not given")
    try:
      limit = int(self.request.get("new_limit"))
    except ValueError:
      raise ValidationError("Limit is not given or invalid")
    
    timer_str = self.request.get("new_timer")
    if timer_str:
      try:
        timer = int(timer_str)
      except ValueError:
        raise ValidationError("Timer is invalid")
    else:
      timer = None

    if 0 < Cap.all().filter('owner =', owner).filter('site =', site).count():
      raise ValidationError("site %s is already capped" % site)
    toadd  = Cap(owner=owner, site=site, limit=limit, timer=timer)
    toadd.put()


class ResignHandler(PageHandler, RedirectMixin):

  @property
  def template_path(self):
    return os.path.join(os.path.dirname(__file__), 'templates/resign.html')

  @login_required
  def get(self):
    self.response.out.write(template.render(self.template_path,
                                            self.template_vars()))

  def post(self):
    user = users.get_current_user()
    if not user:
      return self.redirect_to_welcome()
    db.delete(Profile.all().filter("user =", user).fetch(10))
    # XXX: iterate until all data is really deleted.
    db.delete(Cap.all().filter('owner =', user).fetch(1000))
    self.redirect_to_logout_welcome()
    
class ClientAPIErorr(Exception):

  def __init__(self, status, message):
    Exception.__init__(self, message)
    self.status = status


class VisitAPIHandler(webapp.RequestHandler):

  def visit_site(self, user, site):
    tovisit = Cap.all().filter('owner =', user).filter('site =', site).get()
    if not tovisit:
      raise ClientAPIErorr(400, "site %s is not found" % site)
    tovisit.visit()
    return {
      "visited": tovisit.to_plain()
    }

  def post(self):
    try:
      user = users.get_current_user()
      if not user:
        raise ClientAPIErorr(403, "Should login first")
      site = self.request.get("site")
      if not site:
        raise ClientAPIErorr(400, "site is missing")
      result = self.visit_site(user, site)
      self.response.headers.add_header("Content-Type", "application/json")
      self.response.out.write(simplejson.dumps(result))
    except ClientAPIErorr, e:
      self.response.set_status(e.status)
      self.response.out.write(str(e))
      

class ListAPIHandler(webapp.RequestHandler):

  def list_site(self, user):
    tolist = Cap.all().filter('owner =', user).fetch(LARGE_ENOUGH_TO_FETCH)
    return {
      "list": [i.to_plain() for i in tolist]
    }

  def get(self):
    try:
      user = users.get_current_user()
      if not user:
        raise ClientAPIErorr(403, "Should login first")
      result = self.list_site(user)
      self.response.headers.add_header("Content-Type", "application/json")
      self.response.out.write(simplejson.dumps(result))
    except ClientAPIErorr, e:
      self.response.set_status(e.status)
      self.response.out.write(str(e))


def main():
  application = webapp.WSGIApplication([('/dashboard', DashboardHandler),
                                        ('/resign', ResignHandler),
                                        ('/cap/visit', VisitAPIHandler),
                                        ('/cap/list', ListAPIHandler),
                                        ('/', WelcomeHandler)],
                                       debug=True)
  wsgiref.handlers.CGIHandler().run(application)


if __name__ == '__main__':
  main()
