// ***************************************************************************
// *  startup.js
// *
// ****************************************************************************/
//
// Copyright (c) 2009 Larry Moore, larmoor@gmail.com
// Released under the MIT License 
// http://www.opensource.org/licenses/mit-license.php 
// http://en.wikipedia.org/wiki/MIT_License
//
// Permission is hereby granted, free of charge, to any person
// obtaining a copy of this software and associated documentation
// files (the "Software"), to deal in the Software without
// restriction, including without limitation the rights to use,
// copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the
// Software is furnished to do so, subject to the following
// conditions:
//
// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
// OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
// HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
// WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
// OTHER DEALINGS IN THE SOFTWARE.
//
//
//*****************************************************************************
// This module initializes the USNG application, and manages the size of the map window and associated
//    information window.
//
// Significant parts of this module are borrowed from a Google mashup by Matthew Somerville at
//     http://traintimes.org.uk/map/.  This code is responsible for the overall design of the USNG application.

// smallest scale at which USNG zone lines display
var ZONES = 4;
// smallest scale at which GARS 30-min cell lines are displayed
var GARCELL = 8;
// smallest scale at which GARS 15-min quadranges are displayed
var GARQUAD = 10;
// smallest scale at which GARS 3-min keypads are displayed
var GARKEY = 12;

// largest scale at which 100m grid is displayed
var GRID100m=16;


var zonelinecolor = "#ff0000"
var zonelinewidth = 5
var zonelineopacity = .40

var k100_linecolor = "#0000ff"
var k100_linewidth = 3
var k100_lineopacity = .40

var k1_linecolor = "#000000"
var k1_linewidth = 1
var k1_lineopacity = 1

var m100_linecolor = "#ff6633"
var m100_linewidth = 1
var m100_lineopacity = 1

var cellslinecolor = "#00ff00"
var cellslinewidth = 4
var cellslineopacity = .30

var quadslinecolor = "#00ff00"
var quadslinewidth = 2
var quadslineopacity = 1

var keyslinecolor = "#000000"
var keyslinewidth = 1
var keyslineopacity = 1

var usngmap = null;
var marker_point;
var coords
var google_map

var user_startlat
var user_startlng
var user_startzoom
var user_startusng
var user_maptype
var scale_factor

var curr_usng_view = null    // object that models the current viewport for placement of USNG lines
var lines_ = null      // object that contains zone lines
var lines100k = null
var lines1k = null
var lines100m = null

var gars_view_cells = null;    // object that models the current viewport for placement of GARS lines
var cells_ = null;    // object that contains GARS cell lines
var gars_view_quad = null;
var quad_ = null;
var gars_view_key = null;
var key_ = null;


function load() {
if (GBrowserIsCompatible()) {
	switchtoSearch();
	Update.mapSize();
	GEvent.bindDom(window,"resize",this,this.Update.mapSize);
	usngmap = new GMap2(document.getElementById('map'),{draggableCursor: 'crosshair', draggingCursor: 'pointer'}  );
	usngmap.addMapType(G_PHYSICAL_MAP);
	usngmap.addControl(new GLargeMapControl());
	usngmap.addControl(new GMapTypeControl());
//		usngmap.addControl(new GOverviewMapControl());
	usngmap.addControl(new GScaleControl());
	usngmap.zoneon = false;    // flag to tell if utm zones should be displayed
	usngmap.cellon = false;    // flag to tell if gars cells should be displayed
	usngmap.grid100kon = false;
	usngmap.grid1kon=false;
	usngmap.grid100mon=false;
	showCoordinates();
	addClickListener();
	addUSNGlistener();
	addZoomlistener();
	addPanlistener();
	document.getElementById("info").innerHTML = Info.VisibleText + Info.DefaultText
	readStartParameters();
	GridOptions.Show(3, scale_factor)
	initializeMap();
	curr_usng_view = new usngviewport(usngmap)  // initial instance of the USNG viewport
	gars_view_cells = new garsviewport(usngmap,1)  // initial instance of the GARS viewport
   }
}


// add listener to continuously update usng coordinate output
function addUSNGlistener() { 
   GEvent.addListener(usngmap, 'mouseout', function(point) {
      blankCoordinates();
   });

   GEvent.addListener(usngmap, 'mousemove', function(point) {
      updateCoordinates(point.lng().toFixed(4), point.lat().toFixed(4));
   });
}

// add listener to detect change in zoom level
function addZoomlistener() {
   GEvent.addListener(usngmap,'zoomend', function(oldzoom,newzoom) {
   GridOptions.Show(oldzoom, newzoom)
   });
}

// add listener to detect pan
function addPanlistener() {
GEvent.addListener(usngmap,'moveend', function() {
	
        // a method of class GMap2
        usngmap.checkResize()

	curr_usng_view = new usngviewport(usngmap)

	// usng display stuff
        if (usngmap.zoneon == true) {
   	   usngmap.removeOverlay(lines_);
	   refreshZONES();
        }
        if (usngmap.grid100kon == true) {
	    usngmap.removeOverlay(lines100k);
	    refresh100K();
        }
        if (usngmap.grid1kon == true) {
	    usngmap.removeOverlay(lines1k);
	    refresh1K();
        }
        if (usngmap.grid100mon == true) {
	    usngmap.removeOverlay(lines100m);
	    refresh100m();
        }

	// gars display stuff
	// 30-min cell lines
        if (usngmap.cellon == true) {
	    //usngmap.removeOverlay(cells_);
	    refreshGARS();
        }
   });
}  // end function addPanListener

///////////////////// 'toggle' functions -- called when checkbox is clicked by user //////////////

// response to check box that allows user to turn zone lines on and off
function toggleZoneDisp() {
   if (usngmap.zoneon == false) { 
        usngmap.zoneon=true; 
        //curr_usng_view = new usngviewport(usngmap);  // not sure if this line is ever needed or not
        refreshZONES();
   }
   else { 
       usngmap.removeOverlay(lines_)   
       usngmap.zoneon = false; 
   }
 //   alert("in toggleZoneDisp, property zoneon="+map.zoneon)
}

// 100,000-meter grid squares
function toggle100kDisp() {
   if (usngmap.grid100kon == false) {
       usngmap.grid100kon = true;
       refresh100K();
       if (usngmap.getZoom()>=10 && usngmap.zoneon==true) { 
           lines_.zonemarkerremove()
        }
   }
   else {
       usngmap.removeOverlay(lines100k)
       usngmap.grid100kon = false
       if (usngmap.getZoom()>=10 && usngmap.zoneon==true) { 
           lines_.zonemarkerdraw()
        }
   }
}

// 1,000-meter grid
function toggle1kDisp() {
   if (usngmap.grid1kon == false) {
       usngmap.grid1kon = true;
       refresh1K();
    }
   else {
       usngmap.removeOverlay(lines1k)
       usngmap.grid1kon = false
    }
}

// 100-meter grid
function toggle100mDisp() {
   if (usngmap.grid100mon == false) {
       usngmap.grid100mon = true;
       refresh100m();
    }
   else {
       usngmap.removeOverlay(lines100m)
       usngmap.grid100mon = false
    }
}


// response to check box that allows user to turn GARS cell lines on and off
function toggleCellDisp() {
   if (usngmap.cellon == false) { 
       usngmap.cellon=true; 
       refreshGARS();
   }
   else { 
       if (cells_) {
	   usngmap.removeOverlay(cells_);
       }
       if (quad_) {
	   usngmap.removeOverlay(quad_);
       }
       if (key_) {
	   usngmap.removeOverlay(key_);
       }
       usngmap.cellon = false; 
   }
 //   alert("in toggleCellDisp, property cellon="+map.cellon)
}

//////////////// end toggle functions /////////////////////////////////////////


function addClickListener() {
      // click on map to get lat/long
      GEvent.addListener(usngmap, "click", function(overlay, point) {
        if (overlay) { // user clicked on a marker or balloon...do nothing 
             return 
        }
        // ??var marker_temp = new GMarker(point) 
        // create a string to display various coordinate values
        marker_point=point
        var coords1 = buildCoordString1(point) 
             + '<input type="button" value="Set a marker" onclick=setMarker()>'   
// comment out next line except when running on a USGS system and enabling map download functionality
//          + '<br><input type="button" value="Download GeoPDF USGS map" onclick=downloadUSGSmap()>'
        var coords2 = buildCoordString2(point);

        // if this point is in north america, include nad27 tab
        if (point.y<=50 && point.y>=25 && point.x<= -66 && point.x>= -124) {
           var coords3 = buildCoordString3(point);
           usngmap.openInfoWindowTabsHtml(point,
             [new GInfoWindowTab("Standard",coords1),
              new GInfoWindowTab("Other", coords2) //,
              //new GInfoWindowTab("nad27", coords3)
             ])
        }
        else {
           usngmap.openInfoWindowTabsHtml(point,
             [new GInfoWindowTab("Standard",coords1),
              new GInfoWindowTab("Other", coords2),
             ])
        }
      });
}

// set up on-map USNG coordinate display
function showCoordinates() {
	coords = document.getElementById("_coords");
	coords.style.visibility = 'visible';
}

// when cursor moves outside map, don't display any coordinates
function blankCoordinates() {
    var coords = document.getElementById("_coords");
    coords.innerHTML =  "- - - - -"+"&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"+ "- - - - -";
}

// when cursor movement is detected, update coordinate readout	
function updateCoordinates(lon, lat) {
    var coords = document.getElementById("_coords");

    if (lat<=84 && lat>=-80) {
	coords.innerHTML =  "&nbsp;&nbsp;&nbsp;" + LLtoUSNG(lat,lon,4)+"&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"+lat2dm(lat)+", "+lon2dm(lon);
    }
    else {
	coords.innerHTML =  "[ undefined ]"+"&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"+lat2dm(lat)+", "+lon2dm(lon);
   }
}	




// in response to button click in info window, set a marker
function setMarker()
{
   usngmap.closeInfoWindow()
   displayCoordMarker(marker_point.lat(),marker_point.lng(),"","")
}


// Updates map display.  For example, if user changes the window size. 
 Update = {
    mapSize: function() {
	var m = document.getElementById('map');
	var i = document.getElementById('info');
	var a=getWindowSize();
	var b=kb(m);
	var c=a.height-b.y-24;
	var d=a.width-Info.Width-48;
	m.style.height=c+'px';
	m.style.width=d+'px';
	i.style.width = Info.Width + 'px';
	i.style.height=c+'px';
	var l = document.getElementById('loading').style;
	l.top = (b.y+c/4) + 'px';
	l.left = (b.x+d/2) + 'px';
        if (coords) {
    	   coords.style.top = (c-40) + "px";
//	   coords.style.left = 200 + "px";
        }

	if (usngmap) {
	    // a method of class GMap2
	    usngmap.checkResize();
	    curr_usng_view = new usngviewport(usngmap);
        }
        if (usngmap && (usngmap.zoneon==true)) { 
	    usngmap.removeOverlay(lines_);
            refreshZONES();
        }
        if (usngmap && (usngmap.grid100kon==true)) { 
	    usngmap.removeOverlay(lines100k);
	    refresh100K();
        }
        if (usngmap && (usngmap.grid1kon==true)) { 
	    usngmap.removeOverlay(lines1k);
            refresh1K();
        }
        if (usngmap && (usngmap.grid100mon==true)) { 
	    usngmap.removeOverlay(lines100m);
            refresh100m();
        }

        if (usngmap && (usngmap.cellon==true)) { 
	    //usngmap.removeOverlay(cells_)
           refreshGARS();
           }
    }  // function
}; // update structure


// controls what grids the user is given an option to display...function of zoom level
GridOptions = {
        ShowZones: '<input type="checkbox" name="zonelines" onclick=toggleZoneDisp() />Zones',
        Show100k: '<input type="checkbox" name="lines100k" onclick=toggle100kDisp() />100k grid',
        Show1k: '<input type="checkbox" name="lines1k" onclick=toggle1kDisp() />1k grid',
        Show100m: '<input type="checkbox" name="lines100m" onclick=toggle100mDisp() />100m grid',

	//uncomment to enable display of GARS cells
	//        ShowCells: '<input type="checkbox" name="cellines" onclick=toggleCellDisp() />GARS',

	Show : function(oldzoom,newzoom) {
                // zoom in cases
                if (oldzoom<ZONES && newzoom>=ZONES) {
                   document.getElementById('zonecheckbox').innerHTML = this.ShowZones
                } 
                if (oldzoom<7 && newzoom>=7) {
                      document.getElementById('grid100kcheckbox').innerHTML = this.Show100k;
                }
		//uncomment to show GARS cells
	        //if (oldzoom<GARCELL && newzoom>=GARCELL) {
                //   document.getElementById('cellcheckbox').innerHTML = this.ShowCells
                //} 
                if (oldzoom<13 && newzoom>=13) {
                      document.getElementById('grid1kcheckbox').innerHTML = this.Show1k;
                }
                if (oldzoom<GRID100m && newzoom>=GRID100m) {
                      document.getElementById('grid100mcheckbox').innerHTML = this.Show100m;
                }

                // zoom out cases
                if (oldzoom>=GRID100m && newzoom<GRID100m) {
                   document.inputboxes.lines100m.checked = false
                   document.getElementById('grid100mcheckbox').innerHTML = ''
                   if (lines100m) { lines100m.remove() }
                   usngmap.grid100mon = false
                }
                if (oldzoom>=13 && newzoom<13) {
                   document.inputboxes.lines1k.checked = false
                   document.getElementById('grid1kcheckbox').innerHTML = ''
                   if (lines1k) { lines1k.remove() }
                   usngmap.grid1kon = false
                }
		//uncomment to show GARS cells
		//if (oldzoom>=GARCELL && newzoom<GARCELL) {
 		//   document.inputboxes.cellines.checked = false
	        //   document.getElementById('cellcheckbox').innerHTML = ''
                //   if (cells_) { cells_.remove() } 
                //   usngmap.cellon = false
                //}
                if (oldzoom>=7 && newzoom<7) {
                   document.inputboxes.lines100k.checked = false
                   document.getElementById('grid100kcheckbox').innerHTML = ''
                   if (lines100k) { lines100k.remove() }
                   usngmap.grid100kon = false
                }
                if (oldzoom>=ZONES && newzoom<ZONES) {
		   document.inputboxes.zonelines.checked = false
                   document.getElementById('zonecheckbox').innerHTML = ''
                   lines_.remove()
                   usngmap.zoneon = false
                }
	}
}

Info = {
	Width : 250,

	HiddenText : '<p id="showhide"><a href="" onclick="Info.Show(); return false;">&laquo;</a></p>',

	VisibleText : '<p id="showhide"><a href="" onclick="Info.Hide(); return false;">Hide &raquo;</a></p>',

        DefaultText:  '<br><br><p>This is a demonstration of map coordinate systems that conform to <a href="http://www.uscg.mil/hq/cg5/cg534/nsarc/Georeferencing_info.asp" target=_blank>coordinate recommendations</a> of the <a href="http://www.uscg.mil/hq/cg5/cg534/NSARC.asp" target=_blank>National Search and Rescue Committee</a>.</p><p>Use street addresses as in the Google Maps native interface, or use <a href="http://www.fgdc.gov/usng/index.html" target=_blank>U.S. National Grid</a> coordinates instead.</p><h2>Works best in <a href="http://www.mozilla.com/en-US/firefox/" target=_blank>Firefox</a> or <a href="http://www.google.com/chrome/" target=_blank>Chrome</a></h2>',
        ClearButton:  '<input type="button" value="Clear directions" onclick=clearDirections() />',


	Hide : function() {
		var i = document.getElementById('info');
		this.content = i.innerHTML;
		i.innerHTML = this.HiddenText;
		this.Width = 10;
		Update.mapSize();
	},
	Show : function() {
		var i = document.getElementById('info');
		i.innerHTML = this.content;
		this.Width = 250;
		Update.mapSize();
	}
};

// utility function that helps with changing window size to match map size
function kb(a){
	var b={"x":0,"y":0};
	while(a){
		b.x+=a.offsetLeft;
		b.y+=a.offsetTop;
		a=a.offsetParent;
	}
	return b
}

function getWindowSize(){
	a=new GSize(0,0);
	if(window.self&&self.innerWidth){
		a.width=self.innerWidth;
		a.height=self.innerHeight;
		return a;
	}
	if(document.documentElement&&document.documentElement.clientHeight){
		a.width=document.documentElement.clientWidth;
		a.height=document.documentElement.clientHeight;
		return a;
	}
	a.width=document.body.clientWidth;
	a.height=document.body.clientHeight;
	return a;
}

function readStartParameters() {
    var qsParm = new Array()
    var query = parent.window.location.search.substring(1)
    var parms = query.split('&')
    for (var i=0; i<parms.length; i++) {
       var pos = parms[i].indexOf('=')
       if (pos > 0) {
           var key = parms[i].substring(0,pos)
           var val = parms[i].substring(pos+1)
           qsParm[key] = val
       }
    }


    if (qsParm['usng']) {
       user_startusng = isUSNG(qsParm['usng'])
    }
    if (qsParm['lat']) {
       user_startlat = qsParm['lat']
    }
    if (qsParm['lng']) {
       user_startlng = qsParm['lng']
    }
     if (qsParm['zoom']) {
       user_startzoom = qsParm['zoom']
    }

    if (qsParm['disp']) {
       user_maptype = qsParm['disp']
    }

   if (user_startzoom) {
      scale_factor = parseFloat(user_startzoom)
   }
   else {
      scale_factor = 4
   }

}

function initializeMap() {

   // process command line options
   // if the user provided center coordinates and/or zoom factor on command line, process these
   if (user_startusng) {   // USNG coordinates have priority over lat/lng
      var latlon = GUsngtoLL(user_startusng)
      start_lat = latlon.lat()
      start_lng = latlon.lng()
   }
   else if (user_startlat && user_startlng) {
     start_lat=parseFloat(user_startlat);
     start_lng=parseFloat(user_startlng);
   }
   else {
     start_lat="38"
     start_lng="-93"
   }

   if (user_maptype == 's' || user_maptype == 'S') {
      maptype = G_SATELLITE_MAP
   }
   else if (user_maptype == 'h' || user_maptype == 'H') {
      maptype = G_HYBRID_MAP
   }
   else if (user_maptype == 't' || user_maptype == 'T') {
      maptype = G_PHYSICAL_MAP
   }
   else {
      maptype = G_NORMAL_MAP
   }

   usngmap.setCenter(new GLatLng(start_lat, start_lng), scale_factor, maptype);

   if ((user_startusng) || (user_startlat && user_startlng)) {
      displayCoordMarker(start_lat,start_lng,"","")
   }

}


// redraw UTM zone lines
function refreshZONES() {
   lines_ = new usngzonelines(curr_usng_view,zonelinecolor,usngmap.getZoom(),zonelineopacity)
   usngmap.addOverlay(lines_)
   lines_.zonedraw()
   if (usngmap.getZoom() < 10 || usngmap.grid100kon==false) { 
      lines_.zonemarkerdraw()
   }
}

// redraw 100,000-meter grid USNG lines
function refresh100K() {
    lines100k = new grid100klines(curr_usng_view,k100_linecolor,k100_linewidth,k100_lineopacity);
    usngmap.addOverlay(lines100k);
}

// redraw 1000-meter grid USNG lines
function refresh1K() {
    lines1k = new grid1klines(curr_usng_view,k1_linecolor,k1_linewidth,k1_lineopacity);
    usngmap.addOverlay(lines1k);
}

// redraw 100 meter grid USNG lines
function refresh100m() {
    //************** change line color, etc *************
    lines100m = new grid100mlines(curr_usng_view,m100_linecolor,m100_linewidth,m100_lineopacity);
    usngmap.addOverlay(lines100m);
}

// redraw the GARS lines
function refreshGARS() {
   if (cells_) {
       usngmap.removeOverlay(cells_);   
   }
   if (quad_) {
       usngmap.removeOverlay(quad_);
   }
   if (key_) {
       usngmap.removeOverlay(key_);
   }

   if (usngmap.getZoom()>= GARCELL) {
      gars_view_cells = new garsviewport(usngmap,1);
      cells_ = new garscellines(gars_view_cells,cellslinecolor,
				usngmap.getZoom()/2*cellslinewidth,cellslineopacity);
      usngmap.addOverlay(cells_);
      cells_.zonedraw();
   }

   if (usngmap.getZoom()>= GARQUAD) {
       gars_view_quad = new garsviewport(usngmap,2);
       quad_ = new garscellines(gars_view_quad,quadslinecolor,
				usngmap.getZoom()/4*quadslinewidth,quadslineopacity);
       usngmap.addOverlay(quad_);
       quad_.zonedraw();
   }

   if (usngmap.getZoom()>= GARKEY) {
       gars_view_key = new garsviewport(usngmap,3);
       key_ = new garscellines(gars_view_key,keyslinecolor,
				usngmap.getZoom()/4*keyslinewidth,keyslineopacity);
       usngmap.addOverlay(key_);
       key_.zonedraw();

   }

   if (usngmap.getZoom() < GARQUAD) { 
      cells_.cellmarkerdraw()
   }
   else if (usngmap.getZoom() < GARKEY) {
       quad_.cellmarkerdraw();
   }
   else {
       key_.cellmarkerdraw();
   }
}

