
/* */

var SHUTDOWN_COUNT = 5;
var PASSING_INTERVAL = 1000;

var g_port = chrome.extension.connect();

function postVisited()
{
    g_port.postMessage({ type: "visited", uri: document.location.href });
}

function postPassing()
{
    g_port.postMessage({ type: "passing" });
}

function ensureElement(tagName, id) {
    var e = document.getElementById(id);
    if (e) {
	e.parentNode.removeChild(e);
	return e;
    }

    e = document.createElement(tagName);
    e.setAttribute("id", id);
    return e;
}

var g_passingTimer = null;

function PassingProgress(cap)
{
    this.cap = cap;
    this.startTime = (new Date()).getTime();
    this.passings = 0;
    this.passes = 0;

    this.markPassing = function() {
	this.passings++;
    };

    this.markPassed = function() {
	this.passes++; 
    };

    this.activeRate = function() {
	return this.passes/this.passings || 0.0;
    };

    this.activeDuraton = function (now) {
	return (now - this.startTime)*(this.activeRate());
    };

    this.expirationRate = function(now) {
	var tms = this.cap.timer*60*1000;
	var ams = this.activeDuraton(now || new Date().getTime());
	return ams/tms;
    };

    this.expired = function(now) {
	return 1.0 <= this.expirationRate(now);
    };

    this.log = function() {
	console.log("progress", this.passings, this.passes, this.startTime, this.cap);
    };
}

function startPassingTimer(progress, expiration)
{
    g_passingTimer = window.setInterval(function() {
	progress.markPassing();
	postPassing();
    }, expiration);
}

function stopPassingTimer()
{
    if (g_passingTimer) {
	window.clearInterval(g_passingTimer);
	g_passingTimer = null;
    }
}

function handlePassed(progress)
{
    progress.markPassed();
    var now = new Date().getTime();
    if (!progress.expired(now))
	return;
    stopPassingTimer();
    postVisited();
}

function hideMeterTooltip()
{
    var el = document.getElementById("addictionMeter");
    if (!el)
	return;
    el.style.display = "none";
}

function showMeterTooltip(cap)
{
    var el = ensureElement("div", "addictionMeter");
    var level = (cap.visits.length + 1) / (cap.limit + 1);
    el.setAttribute("style", 
		    "position:fixed; right: 1em; z-index: 16777216; width:7em; " +
		    "top: 5%; background-color:red; color: white; padding: 0.5em;" +
		    "font-family: verdana; font-weight: bold; line-height: 1.5em; font-size: small;" +
		    "opacity: " + level + ";");

    var timerStr = "";
    if (cap.timer) {
	timerStr = ("<div style='width:100%; height:1em; text-align: center;'>" +
		    "<canvas id='meterCanvas' style='width:100%; height:100%;' /></div>");
    }

    el.innerHTML = ("<div>addicting...</div>" +
		    "<div>" + cap.visits.length + "/" + cap.limit + "</div>" +
		   timerStr);
    document.body.appendChild(el);

    if (cap.timer) {
	// when we have timer for the site,
	// the timer can be stopped by clicking the meter.
	el.style.cursor = "pointer";
	el.setAttribute("title", "click to stop");
	el.addEventListener("click", stopMeter);
    }
    return document.getElementById('meterCanvas');
}

function stopMeter()
{
    stopPassingTimer();
    hideMeterTooltip();
}

function requestClose()
{
    g_port.postMessage({ type: "close" });
}

var g_count = SHUTDOWN_COUNT;
var g_cancelClose = false;

function cancelClose()
{
    g_cancelClose = true;
}

function hideCap()
{
    document.getElementById("capScreen").setAttribute("style", "display: none;");
}

function countdownCapScreen()
{
    if (g_cancelClose)
	return;

    g_count--;
    if (g_count < 0) {
	requestClose();
	return;
    }

    var counterEl = document.getElementById("cyaCounter");
    counterEl.innerHTML = g_count;
    window.setTimeout(countdownCapScreen, 1000);
}

function showCapScreen(cap)
{
    function pad(n) { return n < 10 ? '0' + n : n; }

    var last = cap.visits[cap.visits.length - cap.limit];
    var today = new Date();
    var until = new Date(last*1000);
    until.setDate(until.getDate()+1);
    var whatdate = today.getDate() == until.getDate() ? "today." : "tomorrow.";
    var untilStr = (pad(until.getHours()) + ":" + pad(until.getMinutes()));

    var el = ensureElement("div", "capScreen");
    el.setAttribute("style", 
		    "position:fixed; z-index: 16777216; left: 2%; top:2%; min-width:84%; height:80%;" +
		    "background-color:white; padding: 0.5em; padding-top: 10%; padding-left: 10%;" +
		    "border-style: dashed; border-width:5px; border-color: black; font-family: verdana;" +
		    "");
    
    var linkPanelStyle = ("padding-left:1e; padding-top: 0.5em; padding-bottom:0.5em; font-size: 14pt;" +
			  "text-align:left;");
    var mainLinkStyle = "color: #2276bb; font-weight: bold; font-size: 20pt;";
    var linkStyle = "color: #2276bb;";
    var counterStyle = ("color: #2276bb; " +
			"font-weight: bold; font-size: 38px; width:1.5em; text-align: center;" +
			"position: fixed; top: 80%; left: 80%; " + 
			"border-style: solid; border-color: #2276bb; border-width: 5pt; padding: 0.2em; " +
			"cursor: pointer;");

    var dashboardUri = "http://capyoura.appspot.com/dashboard?chart=" + cap.site;

    el.innerHTML = ("<div style='text-align:left; font-family: verdana; color: #900;"  +
 		    "font-weight: bold; font-size: 32pt; padding-bottom:0.5em; '>" +
		    "YOU'VE ADDICTED!" + 
		    "</div>" +
		    "<div style='text-align:left; font-family: verdana; color: #222;"  +
 		    "font-weight: normal; font-size: 18pt; padding-bottom:1em; '>" +
		    "...and capped until <span style='font-weight: bold;'>" + untilStr + "</span> " + whatdate + 
		    "</div>" +
		    "<div style='" + linkPanelStyle + "'>" +
		    "<a id='cyaTakeaway' style='" + mainLinkStyle + "' href='#'>&raquo; OK. Take me away.</a>" +
		    "</div>" +
		    "<div>&nbsp;</div>" +
		    "<div style='" + linkPanelStyle + "'>" +
		    "<a id='cyaNothankyou' style='" + linkStyle + "' href='#'>&raquo; No thank you. I'm a webholic afterall...</a>" +
		    "</div>" +
		    "<div style='" + linkPanelStyle + "'>" +
		    "<a id='cyaDashboard' style='" + linkStyle + "' href='" + dashboardUri + "'>&raquo; Open dashboard.</a>" +
		    "</div>" +
		    "<div id='cyaCounter' style='" + counterStyle + "'>" +
		    g_count +
		    "</div>"
		   );
    document.body.appendChild(el);

    document.getElementById("cyaCounter").addEventListener
    ("click", function(evt) {
	evt.target.style.borderColor = evt.target.style.color = 'gray';
	cancelClose();
    });

    document.getElementById("cyaTakeaway").addEventListener
    ("click", function(evt) {
	requestClose();
	evt.preventDefault();
    });

    document.getElementById("cyaNothankyou").addEventListener
    ("click", function(evt) {
	hideCap();
	cancelClose();
	evt.preventDefault();
    });

    window.setTimeout(countdownCapScreen, 1000);
}

function drawMeterProgress(canvas, pp)
{
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = '#800';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width*pp.expirationRate(), canvas.height);
}

function initialize()
{
    var cap = null;
    var pp = null;
    var meterCanvas = null;

    g_port.onMessage.addListener(function(cmdStr) {
	cmd = JSON.parse(cmdStr); 
	switch (cmd.type)
	{
	case "cap":
	    var now = (new Date()).getTime();
	    cap = cmd.cap;
	    pp = new PassingProgress(cap);
	    if (cap.visits.length < cap.limit) {
		meterCanvas = showMeterTooltip(cap, pp);
		if (0 < cap.timer) {
		    startPassingTimer(pp, PASSING_INTERVAL);
		}
	    } else {
		stopMeter();
		showCapScreen(cap);
	    }
	    break;
	case "passed":
	    handlePassed(pp);
	    console.log(meterCanvas);
	    drawMeterProgress(meterCanvas, pp);
	    break;
	}
    });

    if (window.parent == window) { // only visit root frame
	postVisited();
    }
}

initialize();

