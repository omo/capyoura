
/* */

var VISIT_DELAY = 500; // effort to skip redirection
var SHUTDOWN_COUNT = 5;

var g_port = chrome.extension.connect();

function ensureElement(tagName, id) {
    var e = document.getElementById(id);
    if (e) {
	e.parent.removeChild(e);
	return e;
    }

    e = document.createElement(tagName);
    e.setAttribute("id", id);
    return e;
}

function showMeterTooltip(cap)
{
    var el = ensureElement("div", "addictionMeter");
    var level = (cap.visits.length + 1) / (cap.limit + 1);
    el.setAttribute("style", 
		    "position:fixed; right: 1em; z-index: 1000; " +
		    "top: 5%; background-color:red; color: white; padding: 0.5em;" +
		    "font-family: verdana; font-weight: bold; line-height: 1.5em;" +
		    "opacity: " + level + ";");
    el.innerHTML = ("<div>addicting...</div>" +
		    "<div>" + cap.visits.length + "/" + cap.limit + "</div>");
    document.body.appendChild(el);
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
		    "position:fixed; z-index: 1000; left: 2%; top:2%; min-width:84%; height:80%;" +
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
			"border-style: solid; border-color: #2276bb; border-width: 5pt; padding: 0.2em");

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
		    "<a id='cyaDashboard' style='" + linkStyle + "' href='http://capyoura.appspot.com/dashboard'>&raquo; Open dashboard.</a>" +
		    "</div>" +
		    "<div id='cyaCounter' style='" + counterStyle + "'>" +
		    g_count +
		    "</div>"
		   );
    document.body.appendChild(el);

    el.addEventListener
    ("click", function(evt) {
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

function initialize()
{
    g_port.onMessage.addListener(function(capStr) {
	cap = JSON.parse(capStr);
	if (cap.visits.length < cap.limit) {
	    showMeterTooltip(cap);
	} else {
	    showCapScreen(cap);
	}
    });

    window.setTimeout(function() {
	if (window.parent == window) { // only visit root frame
	    g_port.postMessage({ type: "opened", uri: document.location.href });
	}
    }, VISIT_DELAY);
}

initialize();

