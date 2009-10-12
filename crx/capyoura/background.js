
Capyoura = {}

Capyoura.BASE_URI = "http://capyoura.appspot.com/";
//Capyoura.BASE_URI = "http://localhost:8081/";

Capyoura.clearCap = function()
{
    Capyoura.caps = {};
};

Capyoura.loadCapList = function(capList)
{
    Capyoura.clearCap();
    capList.each(function (item) {
	Capyoura.caps[item.site] = item;
    });
};

Capyoura.listSiteCandidates = function(uri)
{
    var m = (new RegExp("http://(.*?)/")).exec(uri);
    if (!m) {
	return [];
    }

    var fullsite = m[1];
    var ret = [];
    var elms = fullsite.split("."); // we do not consider hostname like "foo.bar.".
    while (0 < elms.length) {
	ret.push(elms.join("."));
	elms.shift();
    }

    return ret;
};

Capyoura.capFor = function(uri)
{
    if (!Capyoura.caps) {
	return null;
    }

    var maysites = Capyoura.listSiteCandidates(uri);
    var len = maysites.length;
    for (var i=0; i<len; ++i) {
	var found = Capyoura.caps[maysites[i]];
	if (found) {
	    return found;
	}
    }
    
    return null;
};

Capyoura.updateCap = function(cap)
{ 
    Capyoura.caps[cap.site] = cap;
}

function CapLister(donefn, errorfn)
{
    this.retryInterval = 5000;
    this.retryThres = 10;
    this.retryCount = 0;
    this.done = false;

    this.startRequest = function ()
    {
	this.retryCount++;
	console.log("Lister try:" + this.retryCount);
	if (this.done) {
	    console.log("done.");
	    return;
	};

	if (this.retryThres <= this.retryCount) {
	    console.log("gaveup retry...");
	    return;
	}

	console.log("startRequest 2: try:" + this.retryCount);

	var xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function() {
	    //console.log("Lister: " + this.retryCount + ", reasyState:" + xhr.readyState);
	    if (xhr.readyState == 4) {
		switch (xhr.status)
		{
		case 200:
		    if (xhr.responseText) {
			donefn(JSON.parse(xhr.responseText));
			this.done = true;
		    }
		    break;
		case 403:
		    errorfn(403, "please login");
		    this.done = true;
		    break;
		default:
		    console.log("something wrong:" + xhr.status + ":" + xhr.statusText);
		}
	    }
	}.bind(this);
	
	xhr.onerror = function(error) {
	    console.log("error");
	    console.log(error);
	    errorfn(0, error.toString());
	}.bind(this);

	xhr.open("GET", Capyoura.BASE_URI + 'cap/list', true);
	xhr.send();
	// XHR fails often - we need retry.
	window.setTimeout(this.startRequest.bind(this), 3000);
    };

    window.setTimeout(this.startRequest.bind(this), 0);
};

function CapVisitor(cap, donefn, errorfn)
{
    console.log("Visitor start");

    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
	console.log("Visitor reasyState:" + xhr.readyState);
	if (xhr.readyState == 4) {
	    switch (xhr.status)
	    {
	    case 200:
		if (xhr.responseText) {
		    donefn(JSON.parse(xhr.responseText));
		}
		break;
	    case 403:
		errorfn(403, "please login");
		break;
	    default:
		console.log("something wrong:" + xhr.status + ":" + xhr.statusText);
	    }
	}
    }.bind(this);
    
    xhr.onerror = function(error) {
	console.log("error");
	console.log(error);
	errorfn(0, error.toString());
    }.bind(this);

    var topost = Capyoura.BASE_URI + 'cap/visit?site=' + escape(cap.site);
    xhr.open("POST", topost, true);
    xhr.send();
};


function listLoaded(listObj) {
    console.log("loaded:", listObj);
    Capyoura.loadCapList(listObj.list);

    var tips = chrome.extension.getToolstrips();
    for (var i in tips) {
	tips[i].setOKIcon();
    }
}

function capVisited(visitObj) { 
    console.log("visited:", visitObj);
    Capyoura.updateCap(visitObj.visited);
}

function notifyError(status, message) {
    switch (status)
    {
    case 403:
	Capyoura.clearCap();
	promptLogin();
	break;
    default:
	console.log(message);
    }
}

function promptLogin()
{
    var tips = chrome.extension.getToolstrips();
    for (var i in tips) {
	tips[i].setErrorIcon();
    }
}

function listCaps()
{
    new CapLister(listLoaded, notifyError);
}

function yesterday()
{
    var today = new Date();
    today.setDate(today.getDate()-1);
    return today;
}

function tosec(date) {
    return date.getTime()/1000;
}
function revisit(lastVisits)
{
    var y = tosec(yesterday());
    return lastVisits.concat([tosec(new Date())]).filter(function (d) {
	return y < d;
    });
}

function initialize()
{
    chrome.extension.onConnect.addListener(function(port) {
	console.log("tab:" + port.tab.id);
    
	port.onMessage.addListener(function(cmd) {
	    switch (cmd.type)
	    {
	    case "visited":
		console.log("visited:", cmd.uri);
		var cap = Capyoura.capFor(cmd.uri);
		if (!cap) {
		    console.log("cap is not found for: " + cmd.uri);
		    return;
		}

		chrome.tabs.getSelected(null, function(selectedTab) {
		    if (selectedTab.id != port.tab.id) {
			// source tab is not active one - we can ignore the visit.
			return;
		    }

		    cap.visits = revisit(cap.visits); 
		    
		    // XXX: prototype.js make JSON.stringify wrong, 
		    // that seems break object serialization for inter-process communication.
		    // so we serialize it with hand.
		    port.postMessage(Object.toJSON(cap));
		    new CapVisitor(cap, capVisited, notifyError);
		});
		break;
	    case "close":
		console.log("to close");
		chrome.tabs.remove(port.tab.id);
		break;
	    case "list":
		listCaps();
		break;
	    }
	});
    });

    listCaps();
}

initialize();
console.log("background is initialized.");
