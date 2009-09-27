
/* */

var port = chrome.extension.connect();

function showMeterTooltip(cap)
{
    var el = document.createElement("div");
    el.setAttribute("id", "addictionMeter");
    var level = (cap.visitCount + 1) / (cap.limit + 1);
    el.setAttribute("style", 
		    "position:absolute; right: 1em; " +
		    "top: 1em; background-color:red; color: white; padding: 0.5em;" +
		    "opacity: " + level + ";");
    el.innerHTML = ("<div>addicting...</div>" +
		    "<div>" + cap.visitCount + "/" + cap.limit + "</div>");
    document.body.appendChild(el);
}

function showCapScreen(cap)
{
    // XXX: extract styles to seaprate file.
    var el = document.createElement("div");
    el.setAttribute("id", "capScreen");
    el.setAttribute("style", 
		    "position:absolute; left: 2%; top:2%; min-width:84%; height:80%;" +
		    "background-color:white; padding: 0.5em; padding-top: 10%; padding-left: 10%;" +
		    "border-style: dashed; border-width:5px; border-color: black;" +
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

port.onMessage.addListener(function(cap) {
    console.log("cap:" + JSON.stringify(cap));
    if (cap.visitCount < cap.limit) {
	showMeterTooltip(cap);
    } else {
	showCapScreen(cap);
    }
});

port.postMessage({ type: "opened", uri: document.location.href });
