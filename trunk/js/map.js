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
 * 2. Geocoder setup for address (needs USNG)
 * 3. AutoComplete bound to the input text
 * 4. Search Type function for switching via the radio button
 * 5. Default search type is address.
 * 6. Radio buttons that behave and switch search types appropriately
 * 7. Form that kicks off the search depending on the type; need the radio buttons in p tags in order to work AND style properly
 * 8. Map click listener for a reverse geocode
 * 9. Zone etc input checkboxes appearing and disappearing depending on zoom level, using CSS
 * 10. USNG Search is translated to a lat/long and precision and the map is panned/zoomed accordingly
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
 * 4. An examination into click listener for the reverse geocode, why is it fired when the Delete Marker button is clicked? 
 * 5. A way to turn off the checkboxes on the gridline inputs when they disappear...but may not be necessary
 * 6. A way to gray out (instead of disable) the USNG or Address inputs when the other one is clicked. When disabled, you can't click in them, and it would be good to just click in the input box to activate it
 * 7. A new marker when a USNG search is performed
 * */


var map,geocoder;
var usngfunc = new USNG2();
var searchType = "address";
var defaultBounds = new google.maps.LatLngBounds(
  new google.maps.LatLng(24.20689,-124.291994),
  new google.maps.LatLng(48.922499,-56.879885));
var autocOptions = {
	  bounds: defaultBounds,
	  types: ['geocode']
	};

function initialize() {
    geocoder = new google.maps.Geocoder();
    var mapOptions = {
      //panControl:false,
      center: new google.maps.LatLng(40.0, -97.5),
      zoom:5,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    map = new google.maps.Map(document.getElementById("map_canvas"),
        mapOptions);
    var inputAddrTxt = document.getElementById('inputAddrTxt');
	
	autocomplete = new google.maps.places.Autocomplete(inputAddrTxt, autocOptions);
	//document.getElementById('inputUSNGTxt').disabled=true;
	
	//add a listener for the autocomplete choice made
	google.maps.event.addListener(autocomplete, 'place_changed', function() {
		document.getElementById('btnSearch').click();
	});
	
  	google.maps.event.addListener(map, 'click', function(event) {
	 	//console.log("Running a reverse geocode at:"+event.latLng.lat()+", "+event.latLng.lng());
	 	reverseGeoCode(event.latLng);
	});
	
	// add listener to detect change in zoom level
	google.maps.event.addListener(map,'zoom_changed', function() {
	   var newzLev=map.getZoom();
	   displayGridOptions(newzLev);
	   });

  displayGridOptions(mapOptions.zoom);

  }


//Start the search, route the search function depending on the search type
function startSearch(addrTxt,USNGTxt) {
	console.log("Starting Text Search of type: "+searchType);
	if (searchType === "address") {
		codeAddress(addrTxt); 
	} else {
		//console.log("Searching on USNG: "+USNGTxt);
		convUSNG(USNGTxt);
	}
	//switchUIMode(1);
}

//Set or switch the search Type
function setSearchType(radiotype) {
	console.log("The type is set to: "+radiotype);
	//set the global searchType variable so it can be used later if necessary
	searchType = radiotype;
	if (searchType === "usng"){
		console.log("Switching to the USNG Search Type.");
		//Disable the address input - but then you can't click in it to activate it!
		//document.getElementById('inputAddrTxt').disabled=true;
		//document.getElementById('inputUSNGTxt').disabled=false;
		//make sure the USNG radio button is selected
		document.getElementById('radioUSNG').checked = true;
		
	} else {
		console.log("Switching to the Address Search Type.");
		//disable the USNG input - but then you can't click in it to activate it!
		//document.getElementById('inputUSNGTxt').disabled=true;
		//document.getElementById('inputAddrTxt').disabled=false;
		//make sure the Address radio button is selected
		document.getElementById('radioAddress').checked = true;
	}
}

//geocode the address, pan/zoom the map, and create a marker via the markers.js script
function codeAddress(addrTxt) {
    var address = addrTxt;
    //var address = document.getElementById('inputTxt').value; //This was a traditional way to do it, not sure if this is best
    console.log("Geocoding address: "+address);
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
  
function convUSNG(txt) {
	console.log("Let's try to convert USNG: "+txt);
	var usngZlev = null;
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
	//reverseGeoCode(foundLatLng);
}

//do a reverse geocode on a clicked point (or dragged marker?)
//Currently not working, unsure why
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

//Control what grids the user is given an option to display...function of zoom level

function displayGridOptions(zLev) {
    // Define different zoom levels for turning on and off input boxes
   
    if (zLev>=4) {
       document.getElementById('zonecheckbox').style.display="inline-block";
    } else {
    	document.getElementById('zonecheckbox').style.display="none";
    } 
    
    if (zLev>=7) {
       document.getElementById('grid100kcheckbox').style.display="inline-block";
    } else {
    	document.getElementById('grid100kcheckbox').style.display="none";
    } 
    
    if (zLev>=13) {
       document.getElementById('grid1kcheckbox').style.display="inline-block";
    } else {
    	document.getElementById('grid1kcheckbox').style.display="none";
    }
       
    if (zLev>=16) {
       document.getElementById('grid100mcheckbox').style.display="inline-block";
    } else {
    	document.getElementById('grid100mcheckbox').style.display="none";
                }
}


//switch the mode of the UI to/from mini search launch button to full search dialog
//Recently added a type variable passed from two different search launch buttons
//NOT USING RIGHT NOW, choosing instead to always have search dialog open
function switchUIMode(mode,type) {
	if (mode === 0) {
		console.log("Launching Search.");
		document.getElementById('usng_search').style.display="block";
		document.getElementById('searchAddLaunch').style.display="none";
		document.forms[0][0].focus();
	} else {
		document.getElementById('searchAddLaunch').style.display="block";
		document.getElementById('usng_search').style.display="none";
	}
}