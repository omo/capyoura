
var Chart = {};

Chart.formatLabelDate = function(date)
{
    var d = date.getHours().toString();
    if (1 == d.length)
	d = "0" + d;
    return d;
    //return date.toString();
};

Chart.drawBars = function(canvas, bars, limit)
{
    var ctx = canvas.getContext('2d'); // XXX: should be factored out?

    var ylpad = 5;
    var x_label_w = canvas.width*0.1;
    var y_label_w = canvas.height*0.1;
    var x_margin_r = x_label_w;
    var y_margin_t = y_label_w;
    var cl = x_label_w;
    var ct = y_margin_t;
    var cw = canvas.width - x_label_w - x_margin_r;
    var ch = canvas.height - y_label_w - y_margin_t;
    var cb = ct + ch;
    var cr = cl + cw;

    var blen = bars.length;
    var bw   = (cw/blen)*0.8;
    var fontPx = bw/2;

    var labelFillStyle = '#222';
    var barFillStyle = '#800';

    // bg
    ctx.fillStyle = '#eee';
    ctx.fillRect(cl, ct, cw, ch);
    ctx.font = "normal " + fontPx + "px verdana";

    // ylabel and y-line
    ctx.fillStyle = labelFillStyle;
    var ylstep = 2; // origin(skip), middle, limit
    var ylh = ch/ylstep;

    for (var i=0; i<=ylstep; i++) {
	//var val = Math.floor(limit*(i/ylstep));
	var val = limit*(i/ylstep);
	var label = val.toString();
	var label_w = ctx.measureText(label).width;
	var y = cb - i*ylh;
	ctx.fillRect(cl, y, cw, 0.5);
	if (0 != i) // skip origin label
	    ctx.fillText(label, cl - label_w - ylpad, y);
    }

    // bar and xlabel
    for (var i=0; i<blen; i++) {
	var bar = bars[i];
	var bh = ch*bar.count/limit;
	var bl = cl + (cw*i/blen)
	var bb = cb - bh;
	ctx.fillStyle = barFillStyle;
	ctx.fillRect(bl, bb, bw, bh);

	var label = Chart.formatLabelDate(bar.date);
	var label_w = ctx.measureText(label).width;
	ctx.fillStyle = labelFillStyle;
	ctx.fillText(label, bl-label_w/2, cb+fontPx);
    }

};

Chart.collectBars = function(cap, begin, end, nbars)
{
    var ret = [];
    var range = (end - begin);

    for (var i=0; i<nbars; i++) {
	ret[i] = {date: new Date((begin + (i/nbars)*range)*1000), count: 0};
    }

    for (var i=0; i<cap.visits.length; i++) {
	var  v = cap.visits[i];
	var dv = (v - begin)/(end - begin);
	if (dv < 0 || 1 <= dv)
	    continue;
	var vi = Math.floor(dv*nbars);
	ret[vi].count += 1;
    }

    return ret;
};

Chart.draw = function(canvas, cap, width, height)
{
    canvas.width = width;
    canvas.height = height;

    var today = new Date();
    var yeday  = new Date();
    yeday.setDate(yeday.getDate()-1);
    if (1 == today.getHours()%2) { today.setHours(today.getHours() + 1); }
    if (1 == yeday.getHours()%2) { yeday.setHours(yeday.getHours() - 1); }

    var nbars = (24 + today.getHours() - yeday.getHours())/2;
    var todaySec = today.getTime()/1000;
    var yedaySec = yeday.getTime()/1000;
    bars = Chart.collectBars(cap, yedaySec, todaySec, nbars);

    // XXX: handle limit == 0
    Chart.drawBars(canvas, bars, cap.limit);
};

Chart.redraw = function(id)
{
    if (!Chart.lastCap)
	return;
    var canvas = document.getElementById(id);
    Chart.draw(canvas, Chart.lastCap, window.innerWidth, window.innerHeight);
};

Chart.init = function(id)
{
    var query = Capyoura.parseQueryString(document.location.href);
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
	if (xhr.readyState == 4 && xhr.status == 200) {
	    var canvas = document.getElementById(id);
	    Chart.lastCap = JSON.parse(xhr.responseText);
	    Chart.draw(canvas, Chart.lastCap, window.innerWidth, window.innerHeight);
	}
    };

    xhr.open("GET", '/cap?site=' + query['site'], true);
    xhr.send();
};

