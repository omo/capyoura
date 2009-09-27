
Capyoura = {}

Capyoura.BASE_URI = "http://capyoura.appspot.com/";

Capyoura.loadCapList = function(capList)
{
    Capyoura.caps = {};
    capList.each(function (item) {
	Capyoura.caps[item.site] = item;
    });
}

Capyoura.capFor = function(uri)
{
    if (!Capyoura.caps) {
	return null;
    }

    var site = (new RegExp("http://(.*?)/")).exec(uri)[1];
    return Capyoura.caps[site];
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

function CapVisitor(uri, donefn, errorfn)
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

    var topost = Capyoura.BASE_URI + 'cap/visit?uri=' + escape(uri);
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

function initialize()
{
    chrome.extension.onConnect.addListener(function(port) {
	console.log("tab:" + port.tab.id);
    
	port.onMessage.addListener(function(cmd) {
	    switch (cmd.type)
	    {
	    case "opened":
		console.log("opened:", cmd.uri);
		var cap = Capyoura.capFor(cmd.uri);
		if (!cap) {
		    console.log("cap is not found for: " + cmd.uri);
		    return;
		}

		console.log(cap);
		cap.visitCount++; // we know server side will doe same thing.
		port.postMessage(cap);
		new CapVisitor(cmd.uri, capVisited, notifyError);
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
