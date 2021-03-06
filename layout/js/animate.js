var prcpColors;
var prcpTimes;
var pt;
var svg;

var filename;
var cache;

var fetchPrcpColors = $.ajax({url:'js/precip-colors.json', dataType: 'json'});
var fetchPrcpTimes = $.ajax({url:'js/times.json', dataType: 'json'});

var animatePrcp = function(timestep) {
  prcpColors.forEach(function(color, index) {
    var bin = index + 1;
    var tSelector = '.p-' + timestep + '-' + bin;
    
    var $prcpBin = cache(tSelector);
    $prcpBin.css("fill", color);
  });

  var $stormDot = cache('.storm-dot');
  $stormDot.css("opacity", "0").css("transform", "scale(0.1");
  var $currentStormDot = cache('[id=storm-' + timestep + ']');
  $currentStormDot.css('opacity', '1.0').css('transform', 'scale(1)');
  
  var stormX = $currentStormDot.attr('cx');
  var stormY = $currentStormDot.attr('cy');
  
  if ($currentStormDot){
    $currentStormDot.data('cx', stormX);
    $currentStormDot.data('cy', stormY);
  }

  cache('.nwis-dot-' + timestep).css('fill', '#4BA3C3').css('stroke', "white").css('opacity', '1.0');
  cache('.f-' + timestep).css('fill', '#175676').css('stroke', "white").css('opacity', '1.0');
  cache('.off-' + timestep).css('opacity', '0.0');
  cache('[id=timestamp-text]').html(prcpTimes.times[timestep - 1]);

  var darkWidth = (timestep+1)/prcpTimes.times.length;
  cache('[id=spark-light-mask]').attr('x', darkWidth).attr('width', 1 - darkWidth);
  cache('[id=spark-full-mask]').attr('width', darkWidth);
  cache('[id=flood-light-mask]').attr('x', darkWidth).attr('width', 1 - darkWidth);
  cache('[id=flood-full-mask]').attr('width', darkWidth);
};

var play = function() {
  var button = cache('#playButton');
  ga('send', 'event', 'figure', 'user pressed play');
  button.css('display', 'none');
  window.requestAnimationFrame(runAnimation);
};
var pause = function() {
  ga('send', 'event', 'figure', 'user pressed pause');
  pauseAnimation();
  endAnimation();
};
var endAnimation = function() {
  var button = cache('#playButton');
  button.css('display', 'block');
};

var getAnimator = function(duration) {
  var start = null;
  var elapsed = 0;
  var prevIndex = -1;
  var toCancel = null;
  var animateFrame = function(timestamp) {
    if (!start) start = timestamp - elapsed;
    elapsed = timestamp - start;

    if (elapsed < duration) {
      var index = Math.floor(elapsed / duration * prcpTimes.times.length) + 1; // 1-indexed
      if (index !== prevIndex) {
        animatePrcp(index);
        prevIndex = index;
      }
      toCancel = window.requestAnimationFrame(animateFrame);
    } else {
      start = null;
      elapsed = 0;
      animatePrcp(prcpTimes.times.length); // make sure last frame is animated
      endAnimation();
    }
  };
  var pauseFrame = function() {
    window.cancelAnimationFrame(toCancel);
    start = null;
    prevIndex = -1;
  };
  return [animateFrame, pauseFrame];
};

var createCache = function(){
  var selectorCache = {};
  return function(selector) {
    if (!selectorCache.hasOwnProperty(selector)) {
      selectorCache[selector] = $(selector);
    }
    return selectorCache[selector];
  };
};

var animator = getAnimator(8000);
var runAnimation = animator[0];
var pauseAnimation = animator[1];

vizlab.ready(function() {
  cache = createCache();
  $.when(fetchPrcpColors, fetchPrcpTimes).done(function() {
    prcpTimes = fetchPrcpTimes.responseJSON;
    prcpColors = fetchPrcpColors.responseJSON;
    svg = document.querySelector("svg");
    pt = svg.createSVGPoint();
    $('.viz-pause').on('click', function(){
      pause();
    });
    play();
  });
});

var hoverTimer = null;
var hoverDelay = 400; //ms
  
function hovertext(text, evt){
  var tooltip = document.getElementById("tooltip-text");
  var tooltip_bg = document.getElementById("tooltip-box");    
  var tool_pt = document.getElementById("tooltip-point");
  if (evt === undefined){
    if(hoverTimer) {
      clearTimeout(hoverTimer); //stop when off area
    }
    tooltip.firstChild.data = ' ';
    tooltip_bg.setAttribute("class","hidden");
    tooltip_bg.setAttribute("x",0);
    tool_pt.setAttribute("class","hidden");
  } else {
    pt = cursorPoint(evt);
    pt.x = Math.round(pt.x);
    pt.y = Math.round(pt.y);
    var svgWidth = Number(svg.getAttribute("viewBox").split(" ")[2]);
    tooltip.setAttribute("x",pt.x);
    tooltip.setAttribute("y",pt.y);
    tooltip.firstChild.data = text;
    var length = Math.round(tooltip.getComputedTextLength());
    if (pt.x - length/2 - 6 < 0){
      tooltip.setAttribute("x",length/2+6);
    } else if (pt.x + length/2 + 6 > svgWidth) {
      tooltip.setAttribute("x", svgWidth-length/2-6);
    }
    tool_pt.setAttribute("transform","translate("+pt.x+","+pt.y+")");
    tooltip_bg.setAttribute("x",tooltip.getAttribute("x")-length/2-6);
    tooltip_bg.setAttribute("y",pt.y-35);
    tooltip.setAttribute("class","shown");
    tooltip_bg.setAttribute("class","tooltip-box");
    tool_pt.setAttribute("class","tooltip-box");
    tooltip_bg.setAttribute("width", length+12);
    if(hoverTimer){
      clearTimeout(hoverTimer);
    }
    hoverTimer = setTimeout(function(){
      ga("send", "event", "figure", evt.target.id);
    }, hoverDelay);
  }
}
function cursorPoint(evt){  
  pt.x = evt.clientX; pt.y = evt.clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}
function openNWIS(id, event){
 if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
   event.stopPropagation();
  }else{
    url = 'http://waterdata.usgs.gov/nwis/uv?site_no=' + id;
    ga('send', 'event', 'outbound', 'click', url);
    window.open(url, '_blank');
  }
}

function setEmphasis(id) {
  $('[id$=' + id + ']').addClass('emphasis');
}

function clearEmphasis(){
  $(".emphasis").removeClass("emphasis");
  hovertext(" ");
}