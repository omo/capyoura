
function showChart(evt, site) {
    evt.preventDefault();
    var s = escape(site);

    var el = document.createElement("div");
    el.setAttribute("class", "chart");
    el.innerHTML = ("<div class='close'>&#x2573;</div>" +
		    "<div class='caption'>" + escape(site) + "</div>" +
		    "<iframe src='/html/chart.html?site=" + s + "' width='100%' height='80%' ></iframe>");
    document.body.appendChild(el);
    el.addEventListener("click", function(evt) {
	el.parentNode.removeChild(el);
    });
   
}