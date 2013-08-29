/**
 * ***************************************************************************
* *  USNG Map.js  (Launch and initialize Map)
* *  Version 1.0
* ****************************************************************************
*
* Copyright (c) 2013 Mike Dolbow, mmdolbow@gmail.com
* Special Thanks to Larry Moore for original version 2 of this map
* Released under the MIT License 
* http:*www.opensource.org/licenses/mit-license.php 
* http:*en.wikipedia.org/wiki/MIT_License
*
* Permission is hereby granted, free of charge, to any person
* obtaining a copy of this software and associated documentation
* files (the "Software"), to deal in the Software without
* restriction, including without limitation the rights to use,
* copy, modify, merge, publish, distribute, sublicense, and/or sell
* copies of the Software, and to permit persons to whom the
* Software is furnished to do so, subject to the following
* conditions:
*
* The above copyright notice and this permission notice shall be
* included in all copies or substantial portions of the Software.
*
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
* EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
* OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
* NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
* HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
* WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
* FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
* OTHER DEALINGS IN THE SOFTWARE.
 * 
 * HAS: 
 * 1. Map
 * 2. Geocoder setup for address
 * 3. AutoComplete bound to the input text for address
 * 4. Search Type function for switching via the radio button
 * 5. Default search type is address.
 * 6. Radio buttons that behave and switch search types appropriately
 * 7. Form that kicks off the search depending on the type; need the radio buttons in p tags in order to work AND style properly
 * 8. Map click listener for a reverse geocode. Might need to remove based on UAT.
 * 9. Zone etc input checkboxes appearing and disappearing depending on zoom level, using CSS
 * 10. USNG Search is translated to a lat/long and precision and the map is panned/zoomed accordingly
 * 11. Functions to toggle zone and grid lines, which call functions in gridlines.js
 * 12. 
 * 
 * NEEDS:
 * 1. No way to bind/unbind the autocomplete depending if address or usng search is chosen
 *    Attempt to bind to a hidden textbox instead doesn't work
 *    Instead, have two search inputs, activated depending on the choice
 * 2. A separate function for marker creation and infowindow? Consider studying and implementing markers.js from Moore's code,
 *    which facilitates multiple marker generation. It looks like you can copy a good chunk of it, dump some of the alternate
 *    coordinate code, and upgrade some other functions. Keep in mind this app includes the ability to drop multiple markers
 *    and to delete them from their infowindows. So creating a single marker is probably not the best approach.
 * 3. Autocomplete JSON for USNG values? Nahh...this would require jQuery or Dojo for the autocomplete.
 * 4. TESTME An examination into click listener for the reverse geocode, why is it fired when the Delete Marker button is clicked? This should be resolved by now.
 * 5. A way to turn off the checkboxes on the gridline inputs when they disappear...but may not be necessary
 * 6. TESTME A way to gray out (instead of disable) the USNG or Address inputs when the other one is clicked.
 *    When disabled, you can't click in them, and it would be good to just click in the input box to activate it. Below is code for disabling that doesn't work:
 *		console.log("Switching to the USNG Search Type.");
		document.getElementById('inputAddrTxt').disabled=true;
		document.getElementById('inputUSNGTxt').disabled=false; 
 * 7. A new marker when a USNG search is performed
 * 8. Cleanup of zone option, styles, etc, when implementing single graticule style
 * */

//Debug variable. Set to true while developing, false when testing
var debug = false;

/* ****************  Global variables for map.js********
 * curr_usng_view: the current viewport of the map. Used to determine precision needed, required overlays, etc.
 * usngfunc: function for passing UTMs or Lat/Longs and obtaining USNG coordinates, or vice versa
 * searchType: persists what "mode" or "type" of search being conducted by the user: address or USNG
 * defaultBounds: boundaries for autocomplete awareness. Default extent of the map is controled with mapOptions in the initialize functions.
 * autocOptions: options for autocomplete
 * disableClickListener: Boolean for tracking the status of the map click listener. Helps disable the listener in
 *   the event we don't want an inadvertent click, such as deleting a marker, to recenter the map or place a marker.
 */
var map,geocoder,curr_usng_view;
var usngfunc = new USNG2();
var searchType = "address";
var defaultBounds = new google.maps.LatLngBounds(
  new google.maps.LatLng(24.20689,-124.291994),
  new google.maps.LatLng(48.922499,-56.879885));
var autocOptions = {
	  bounds: defaultBounds,
	  types: ['geocode']
	};
var disableClickListener = false;

//******Objects for storing USNG overlay lines**********
//Probably won't need these if we implement the graticule style
var zoneLines = null;
var lines100k = null;
var lines1k = null;
var lines100m = null;

//variables for USNG overlay colors etc
var zonelinecolor = "#FF0000";
var zonelinewidth = 5;
var zonelineopacity = .20;

var k100_linecolor = "#0000ff";
var k100_linewidth = 3;
var k100_lineopacity = .40;

var k1_linecolor = "#000000";
var k1_linewidth = 1;
var k1_lineopacity = 1;

var m100_linecolor = "#ff6633";
var m100_linewidth = 1;
var m100_lineopacity = 1;

/* *********USNG Graticule Styles**********
 * Objects/Globals for USNG Graticules
 * Graticules are another word for 'overlays', just implemented as a whole instead of individually
 */
var graticule = null;

// grid style passed to USNGGraticule
var gridstyle = {
    majorLineColor: "#0000ff",
    majorLineWeight: 3,
    majorLineOpacity: 0.5,
    semiMajorLineColor: "#0000ff",
    semiMajorLineWeight: 2,
    semiMajorLineOpacity: 0.5,
    minorLineColor: "blue",
    minorLineWeight: 1,
    minorLineOpacity: 0.3,
    fineLineColor: "#ff6633",
    fineLineWeight: 1,
    fineLineOpacity: 0.3,

    majorLabelClass:     "majorGridLabel",
    semiMajorLabelClass: "semiMajorGridLabel",
    minorLabelClass:     "minorGridLabel",
    fineLabelClass:      "fineGridLabel"
};


/* ****************
 * Initial Functions for map setup
 * Initialize map and set up listeners
 * mapOptions sets the initial center and zoom level; could be replaced by the users location
 *  with a location-aware app. Still required for users that either can't or won't allow the browser to use their location
 * Launch searches, switch search types
 * The initialize function is called by the onload event of the HTML body
 */

function initialize() {
    geocoder = new google.maps.Geocoder();
    var mapOptions = {
      center: new google.maps.LatLng(40.0, -97.5),
      zoom:5,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    map = new google.maps.Map(document.getElementById("map_canvas"),
        mapOptions);
        
    //Input address text
    var inputAddrTxt = document.getElementById('inputAddrTxt');
    
    //Set initial USNG overlays as off
    map.zoneon = false;    
	map.grid100kon = false;
	map.grid1kon=false;
	map.grid100mon=false;
	
	//add a onetime listener for the map idle so we can instantiate a usng viewport
	google.maps.event.addListenerOnce(map, 'idle', function(){
        console.log("Bounds are: "+this.getBounds());
        curr_usng_view = new usngviewport(this);
    });
	
	//initialize the autocomplete function
	autocomplete = new google.maps.places.Autocomplete(inputAddrTxt, autocOptions);
	
	//add a listener for the autocomplete choice made
	google.maps.event.addListener(autocomplete, 'place_changed', function() {
		document.getElementById('btnSearch').click();
	});
	
  	google.maps.event.addListener(map, 'click', function(event) {
		if (disableClickListener){
			return;
		} else {
			//place a marker at the point clicked
			createMarker(event.latLng);
			
			//Run a reverse Geocode when clicking the map - only desirable if we want an address showingup
			//console.log("Map was clicked.");
		 	//reverseGeoCode(event.latLng);
		}
	});
	
	//Grid check boxes styles. Can likely move to CSS once testing is settled	    
   document.getElementById('gridcheckbox').style.display="inline-block";
   //Use this to hide the grid checkbox in case you don't want it:
   //document.getElementById('gridcheckbox').style.display="none";
    
}


//Start the search, route the search function depending on the search type
function startSearch(addrTxt,USNGTxt) {
	console.log("Starting Text Search of type: "+searchType);
	if (searchType === "address") {
		codeAddress(addrTxt); 
	} else { //with only two search types, assume USNG if not address
		USNGTxt = USNGTxt.toLocaleUpperCase();
		convUSNG(USNGTxt);
	}
}

//Set or switch the searchType variable so it can be used later if necessary
//Make sure the radio button reflects the status
function setSearchType(radiotype) {
	searchType = radiotype;
	if (searchType === "usng"){
		document.getElementById('radioUSNG').checked = true;
	} else {
		document.getElementById('radioAddress').checked = true;
	}
}

/* ************* UTILITY FUNCTIONS ************
 * Geocoding
 * USNG conversion
 * Reverse Geocoding Functions
 * Map click listener toggle
 */

//geocode the address, pan/zoom the map, and create a marker via the markers.js script
function codeAddress(addrTxt) {
    var address = addrTxt;
    geocoder.geocode({'address':address}, function(results,status) {
      if (status == google.maps.GeocoderStatus.OK) {
        map.setCenter(results[0].geometry.location);
        map.fitBounds(results[0].geometry.viewport);
        createMarker(results[0].geometry.location,results[0].formatted_address);
      } else {
        alert("Geocode was not successful for the following reason: " + status);
      }
    });
  }
  
//Convert a USNG string to a lat long for a marker and zooming
function convUSNG(txt) {
	//console.log("Let's try to convert USNG: "+txt);
	var usngZlev = null; //set up a zoom level for use later
	try {
		var foundLLobj = usngfunc.toLonLat(txt,null);
	}
	catch(err)
	{
		alert(err);
		return null;
	}
	console.log("Lat long components are: Precision - "+foundLLobj.precision+" Lat:"+foundLLobj.lat+" Long:"+foundLLobj.lon);
	
	//need best way to get a zoom level based on the returned precision
    //trying to get to 0 = 100km, 1 = 10km, 2 = 1km, 3 = 100m, 4 = 10m, 5 = 1m, ...
	//This is a crude way to do this, just like in when we go from precision to zoom level
        if (foundLLobj.precision===0) {usngZlev=6;}
			else if (foundLLobj.precision===1) {usngZlev=10;}
			else if (foundLLobj.precision===2) {usngZlev=12;}
			else if (foundLLobj.precision===3) {usngZlev=14;}
			else if (foundLLobj.precision===4) {usngZlev=16;}
			else if (foundLLobj.precision===5) {usngZlev=18;}
			else {usngZlev=21;}
	
	map.setZoom(usngZlev);
	console.log("New zoom level is: "+usngZlev);
	var foundLatLng = new google.maps.LatLng(foundLLobj.lat,foundLLobj.lon);
	map.setCenter(foundLatLng);
	createMarker(foundLatLng,null);
}

//do a reverse geocode on a clicked point or dragged marker
//If we use this exact code even for map clicks, 
//the marker will "snap" to the nearest road. Not really desirable in large rural areas.
//so we limit the use of this function
function reverseGeoCode (pnt){
	//map.setCenter(pnt);
	geocoder.geocode({'latLng': pnt}, function(results, status) {
      if (status == google.maps.GeocoderStatus.OK) {
        map.setCenter(results[0].geometry.location);
        createMarker(results[0].geometry.location,results[0].formatted_address);
        //can we / should we open up the infowindow here? Or fill the new address into the search window?
      } else {
        alert("Geocode was not successful for the following reason: " + status);
      }
    });
}

//toggle the listener on the map click event
function mapClickListenerToggle() {
	if (disableClickListener){
		//console.log("Turning ON the map click listener.");
		disableClickListener=false;
		} else {
		//console.log("Turning OFF the map click listener.");
		disableClickListener=true;
	}
}

/* **************************
 * Grid and Overlay Functions
 * **************************
 */ 


// response to check box that allows user to turn grid lines on and off
// Can probably consolidate this function and the next
function toggleGridDisp() {
   if (map.zoneon == false) { 
        map.zoneon=true; 
        //curr_usng_view = new usngviewport(map);  // resets the usngviewport - required since the map might have changed
        //console.log("After hitting toggle, Viewport longs are now: "+curr_usng_view.lngs());
        refreshZONES();
     
   }
   else {   
       //zoneLines.setMap(null);
       graticule.setMap(null);
       map.zoneon = false; 

   }
 //   alert("in toggleZoneDisp, property zoneon="+map.zoneon)
}

// redraw UTM zone lines
function refreshZONES() {
   console.log("Zone lines being added via refreshZONES.");
   //zoneLines = new usngzonelines(curr_usng_view,zonelinecolor,zonelineopacity,zonelinewidth,map);
   graticule = new USNGGraticule(map,gridstyle);
   /*if (map.getZoom() < 10 || map.grid100kon==false) { 
      zoneLines.zonemarkerdraw();
   }*/
}

// 100,000-meter grid squares
function toggle100kDisp() {
   if (map.grid100kon == false) {
       map.grid100kon = true;
       refresh100K();
       if (map.getZoom()>=10 && map.zoneon==true) { 
           zoneLines.zonemarkerremove();
        }
   }
   else {
       //map.removeOverlay(lines100k)
       lines100k.setMap(null);
       map.grid100kon = false;
       if (map.getZoom()>=10 && map.zoneon==true) { 
           zoneLines.zonemarkerdraw();
        }
   }
}

// 1,000-meter grid
function toggle1kDisp() {
   if (map.grid1kon == false) {
       map.grid1kon = true;
       refresh1K();
    }
   else {
       //map.removeOverlay(lines1k)
       lines1k.setMap(null);
       map.grid1kon = false;
    }
}

// 100-meter grid
function toggle100mDisp() {
   if (map.grid100mon == false) {
       map.grid100mon = true;
       refresh100m();
    }
   else {
       //map.removeOverlay(lines100m)
       lines100m.setMap(null);
       map.grid100mon = false;
    }
}


// redraw 100,000-meter grid USNG lines
function refresh100K() {
    lines100k = new grid100klines(curr_usng_view,k100_linecolor,k100_linewidth,k100_lineopacity);
    //map.addOverlay(lines100k);
    lines100k.setMap(map);
}

// redraw 1000-meter grid USNG lines
function refresh1K() {
    lines1k = new grid1klines(curr_usng_view,k1_linecolor,k1_linewidth,k1_lineopacity);
    //map.addOverlay(lines1k);
    lines1k.setMap(map);
}

// redraw 100 meter grid USNG lines
function refresh100m() {
    //************** change line color, etc *************
    lines100m = new grid100mlines(curr_usng_view,m100_linecolor,m100_linewidth,m100_lineopacity);
    //map.addOverlay(lines100m);
    lines100m.setMap(map);
}

