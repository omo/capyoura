# -*- coding: euc-jp -*-

require 'ubygems'
require 'crxmake'

CrxMake.make(
  :ex_dir => "./crx/capyoura/",
  :pkey   => "./capyoura.pem",
  :crx_output => "./gae/capyoura/static/releases/capyoura.crx",
  :verbose => true,
  :ignorefile => /\.(swp|DS_Store)/,
  :ignoredir => /\.(?:svn|git|cvs)/
)
