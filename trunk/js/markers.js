/**
*  markers.js
*
****************************************************************************
 *
 * Originally by Larry Moore
 * Updated for version 3 of the Google Maps API by Mike Dolbow
 * 
 *Updates: Most work done in the first two functions, creating the marker and the string for the infowindow
 * 1. Replace GLatLng with google.maps.LatLng
 * 2. Replace GEvent with google.maps.event ...might need a bit more work
 * 3. Replace GMarker with google.maps.Marker
 * 4. Move Decimal Degrees building functions from buildCoordString2 to buildCoordString1, but commented out for now - could just use the gmaps latlng
 * 5. Killed MGRS and Decimal minutes from buildCoordString1, as well as northAmerica tests
 * 6. Create usngfunc object via Klassen's library, so his functions can be called.
 * 7. Reformatted the passed latlng object into an object literal that USNG2 functions can use
 * 8. Killed InfoWindowTab for single HTML infowindow, since I prefer to just have the
 *    single info window with the formatted address, USNG coordinates, and lat/lng
 * 9. Marker and infoWindow functions wired up properly, with USNG coordinates, lat/lng, and directions
 * 10. Updated info window coordinate precision based on the actual zoom level, not just the one derived from the initial address match
 * 11. A way to delete the marker from the info window
 * 
 * Needs:
 * - An understanding why a map click event fires when the marker is deleted from the infowindow
 * - Need better formula to set the precision for usngfunc.fromLonLat based on the zoom level. Right now it's pretty crude
 * - A way to fill in alternative coordinates in the more.html
 * - An examination of the alt coordinates to better understand how to implement
 * - DisableClickListener variables not working entirely: if we try to set it to false, it is too soon: the map is still clicked
 * 
 *
 ******************************************************************************
 *
 * This module contains most of the code for setting markers and showing info window displays
 * This includes constructing strings of coordinates for display in info window balloons
 * 
*/

//Global Variables
var infowindow = new google.maps.InfoWindow(); //Global infoWindow to show coordinates, etc
var thismarker; //workaround to allow a marker to be deleted from within its own infowindow

google.maps.event.addListener(infowindow,"closeclick", function(){
	disableClickListener = false;
});

// create and display a marker with usng, lat/lng, and other info
function createMarker(latlng,strAddress) {
	var marker = new google.maps.Marker({
		position: latlng,
		map: map
	});

	google.maps.event.addListener(marker, "visible_changed", function() {
		console.log("Marker visibility changed.");
		if (disableClickListener) {disableClickListener = false;}
	});

	//build the info window inside the marker listener so it can be updated with current zoom level
	google.maps.event.addListener(marker, "click", function() {
	  disableClickListener = true;
      thismarker = marker; //set thismarker global equal to this one so it can be deleted
      	var zLev = map.getZoom();
      	if (strAddress != null) {
      		var info_str = strAddress + '<br \/>' ;
      	} else {
      		var info_str = "";
      	}
			
   		info_str += buildCoordString1(latlng,zLev);
	   	if (debug) {
	   		//launch more page
	   		info_str += '&nbsp...<a href=\"more.html" target=\"_blank\">More<\/a>';
	   	}
	   		
   		
   		//include directions
        info_str += '<br\/><a href=\"https:\/\/maps.google.com\/maps?daddr='+latlng.lat()+ ','+latlng.lng()+'\' target=\"_blank\">Directions<\/a>';
   		//include a delete me button
   		info_str += '<br \/><input type=\"button\" value=\"Delete marker\" onclick=removeOneMarker()>';
		
		infowindow.setContent(info_str);
		infowindow.open(map, marker);
   });

}

function removeOneMarker() {
  // global variable 'this marker' is a workaround to delete a marker from within its own info window
  console.log("Removing the marker.");
  infowindow.close();
  thismarker.setMap(null);
  //thismarker.setVisible(false); //doesn't seem to matter how we remove the marker, clicking the button still clicks the map
  //if (disableClickListener) {disableClickListener = false;} //this works too well, too soon.
}


// html string that holds the content of the "standard" tab of an info window
// usng, D.d, directions, and set/delete marker button
function buildCoordString1(point,zLev)  {
        console.log("The lat,lng is: "+point.lat()+ ","+point.lng());
        var lnglat = {lon:point.lng(),lat:point.lat()}; //convert the gmaps latlng object to the format the USNG2 function expects
        //need best way to define precision dynamically based on zoom level
        //trying to get to 0 = 100km, 1 = 10km, 2 = 1km, 3 = 100m, 4 = 10m, 5 = 1m, ...
        //when zoom level 10 ~ 100km, 14 ~ 10km, 16 ~ 1 km, 19 ~ 100m, 22 ~ 7m
		//This is a crude way to do this - Advice based on OpenLayers assumed 19 zoom levels, when Gmaps has more
        if (zLev<8) {precision=0;}
			else if (zLev<12) {precision=1;}
			else if (zLev<14) {precision=2;}
			else if (zLev<18) {precision=3;}
			else if (zLev<21) {precision=4;}
			else {precision=5;}
        
        console.log("The zoom level is: "+zLev + ". The precision is: "+precision);
		var ngCoords = usngfunc.fromLonLat(lnglat, precision);
        coordStr = "<i>USNG:</i> <b>" + ngCoords + "</b>";
        
        // decimal degrees
        var preclng = point.lng().toFixed(precision+2);
        var precLat = point.lat().toFixed(precision+2);
   		coordStr += "<br\/><i>D.d:</i> "+precLat+ ","+preclng;
         
       return(coordStr)
}



// html string that holds coordinates other than NSRC standards (decimal degrees, dms, etc)
function buildCoordString2(point)  {
   var northamerica=1
   var ngCoords = LLtoUSNG(point.y,point.x, 5);
   var mgrsCoords = LLtoMGRS(point.y,point.x, 5);
	var utmcoords=[]
	var zone
 	LLtoUTM(point.y,point.x,utmcoords,0)
	zone = utmcoords[2]
	
	//alert(LLtoGARS(point.y,point.x))

        if (point.y>13 && point.y<90 && ((point.x<-46 && point.x>-180) || (point.x>169 && point.x<180))) { 
            northamerica = 1
        }
        else {
            northamerica = 0
        }

	//utm coordinates
	var utmx = utmcoords[0];
        var utmy = utmcoords[1];
	if (utmy < 0) { utmy+=10000000; }
	latLngStr = "<i>UTM (zone,x,y)</i>: " + zone + UTMLetterDesignator(point.y)+", " + utmx.toFixed(0) + ", " + utmy.toFixed(0);

   // deg-min-sec
   latLngStr += "<br><i>D-M-S</i>: " + lat2dms(point.y)+", " + lon2dms(point.x)
   
	// GARS
	latLngStr += "<br><i>GARS:</i> " + LLtoGARS(point.y,point.x)

   return(latLngStr)
}

function buildCoordString3(point)  {
    var latLngStr = "";

    latLngStr += "The outdated North American<br> Datum of 1927&nbsp;&nbsp;&nbsp;&nbsp;&nbsp";
    latLngStr += "<a href = 'http://localhost/usng/help_usng.html' target=_blank >Help</a><br><br>";
    var LL27 = new Object();
    nad83to27(point.y,point.x,LL27);
    latLngStr += "<i>D-M-S</i>: " + lat2dms(LL27.lat)+", " + lon2dms(LL27.lng)+ "<br>"
    latLngStr += "<i>D-M.m:</i> " + lat2dm(LL27.lat)+", " + lon2dm(LL27.lng) + "<br>"
    latLngStr += "<i>D.d:</i> " +LL27.lat.toFixed(5)+", "+LL27.lng.toFixed(5) + "<br>";
    latLngStr += "<i>USNG:</i> " +LLtoUSNG_nad27(LL27.lat, LL27.lng,5);
    
    return(latLngStr);
}


// convert a latitude to deg and decimal minutes
function lat2dm(input) {
   if (input > 0) {
      return (deg2dm(input)+"N")
   }
   else {
      return (deg2dm(input)+"S")
   }
}
 
// convert a longitude to deg and decimal minutes
function lon2dm(input) {
   if (input > 0) {
      return (deg2dm(input)+"E")
   }
   else {
      return (deg2dm(input)+"W")
   }
}
 
// converts decimal degrees to degrees and decimal minutes
// input is a float, return value a string
function deg2dm(input) {
   var cdeg
   var cmin
   var deg = Math.floor(Math.abs(input))
   var min = (Math.abs(input) - deg)*60

// more readable, but leading zeros not recommended by standards
//   if (deg < 1) { cdeg = "0"+deg }
//   else {cdeg = ""+deg }
//   if (min < 1) { cmin = "0"+min.toFixed(3) }
//   else {cmin = ""+min.toFixed(3) }


   return(deg+"-"+min.toFixed(3))
}


// convert a latitude to deg-min-sec
function lat2dms(input) {
   if (input > 0) {
      return (deg2dms(input)+"N")
   }
   else {
      return (deg2dms(input)+"S")
   }
}
 
// convert a longitude to deg-min-sec
function lon2dms(input) {
   if (input > 0) {
      return (deg2dms(input)+"E")
   }
   else {
      return (deg2dms(input)+"W")
   }
}

// converts decimal degrees to deg-min-sec
// input is a float, return value a string
function deg2dms(input) {
   var cdeg
   var cmin	
   var csec

   var temp = Math.abs(input)
   var deg = Math.floor(temp)
   var min = Math.floor((temp - deg)*60)
   var sec = (((temp-deg)*60)-min)*60


   if (deg < 10) { cdeg = "0"+deg }
   else {cdeg = ""+deg }

   if (min < 10) { cmin = "0"+min }
   else {cmin = ""+min }

   if (sec < 10) { csec = "0"+sec.toFixed(2) }
   else {csec = ""+sec.toFixed(2) }

   return(cdeg+"-"+cmin+"-"+csec)
}
