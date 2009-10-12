
Capyoura = {}

Capyoura.parseQueryString = function(uri)
{
    var i = uri.indexOf("?");
    if (i < 0)
	return {};
    
    return uri.substr(i+1).split('&').inject({}, function(a, i) {
	var kv = i.split("=");
	a[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1]);
	return a;
    });
};
