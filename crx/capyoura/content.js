
/* */

var VISIT_DELAY = 500; // effort to skip redirection
var port = chrome.extension.connect();

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
    var level = (cap.visitCount + 1) / (cap.limit + 1);
    el.setAttribute("style", 
		    "position:fixed; right: 1em; z-index: 1000; " +
		    "top: 5%; background-color:red; color: white; padding: 0.5em;" +
		    "font-family: verdana; font-weight: bold; line-height: 1.5em;" +
		    "opacity: " + level + ";");
    el.innerHTML = ("<div>addicting...</div>" +
		    "<div>" + cap.visitCount + "/" + cap.limit + "</div>");
    document.body.appendChild(el);
}

function showCapScreen(cap)
{
    var el = ensureElement("div", "capScreen");
    el.setAttribute("style", 
		    "position:fixed; z-index: 1000; left: 2%; top:2%; min-width:84%; height:80%;" +
		    "background-color:white; padding: 0.5em; padding-top: 10%; padding-left: 10%;" +
		    "border-style: dashed; border-width:5px; border-color: black; font-family: verdana;" +
		    "opacity: 0.9;");
    
    var linkPanelStyle = ("padding-left:1e; padding-top: 0.5em; padding-bottom:0.5em; font-size: 14pt;" +
			  "text-align:left;");
    var mainLinkStyle = "color: #2276bb; font-weight: bold; font-size: 20pt;";
    var linkStyle = "color: #2276bb;";


    el.innerHTML = ("<div style='text-align:left; font-family: verdana; color: #900;"  +
 		    "font-weight: bold; font-size: 32pt; padding-bottom:1em; '>" +
		    "YOU'VE ADDICTED!" + 
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
		    "</div>"
		   );
    document.body.appendChild(el);

    document.getElementById("cyaTakeaway").addEventListener
    ("click", function(evt) {
	port.postMessage({ type: "close" });
	evt.preventDefault();
    });

    document.getElementById("cyaNothankyou").addEventListener
    ("click", function(evt) {
	document.getElementById("capScreen").setAttribute("style", "display: none;");
	evt.preventDefault();
    });
    
}

function initialize()
{
    port.onMessage.addListener(function(cap) {
	console.log("cap:" + JSON.stringify(cap));
	if (cap.visitCount < cap.limit) {
	    showMeterTooltip(cap);
	} else {
	    showCapScreen(cap);
	}
    });

    window.setTimeout(function() {
	if (window.parent == window) { // only visit root frame
	    port.postMessage({ type: "opened", uri: document.location.href });
	}
    }, VISIT_DELAY);
}

initialize();

