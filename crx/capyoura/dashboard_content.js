
/* */

var port = chrome.extension.connect();
port.postMessage({ type: "list" });
