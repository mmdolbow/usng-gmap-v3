// ***************************************************************************
// *  markers.js
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
//
// This module contains most of the code for setting markers and showing info window displays
// This includes constructing strings of coordinates for display in info window balloons
// USGN coordinates are computed with calls to functions in usng.js


// icons
var iconYellow
var iconCircle
var iconRectangle
var icon100k_1
var icon100k_2
var iconGarsCells
var icon1k


// global variable...workaround to allow a marker to be deleted from within its own infowindow
var thismarker

createMarkerIcons();

// create and display a marker with usng, lat/lon, and other coord system info
function displayCoordMarker(lat,lng,zoom,info_str) {
   var point = new GLatLng(lat,lng)
   marker_point = point
   if (zoom) {  // if a zoom level supplied, apply it
      usngmap.setCenter(point,zoom)
   }
   var marker = new GMarker(point,iconYellow);
   info_str += buildCoordString1(point)

   GEvent.addListener(marker, "click", function() {
      thismarker = marker


   // if this point is in north america, include nad27 tab
   if (point.y<=50 && point.y>=25 && point.x<= -66 && point.x>= -124) {
      marker.openInfoWindowTabsHtml([new GInfoWindowTab("Standard",info_str 
          + '<input type="button" value="Delete marker" onclick=removeOneMarker()>'),
          new GInfoWindowTab("Other",buildCoordString2(point)) //,
          //  new GInfoWindowTab("nad27",buildCoordString3(point))
          ]
//////  comment next line out except when code resides on USGS system ///////////////////
//          + '<br><input type="button" value="Download GeoPDF USGS map" onclick=downloadUSGSmap()>'
      );
   }
   else {
      marker.openInfoWindowTabsHtml([new GInfoWindowTab("Standard",info_str 
          + '<input type="button" value="Delete marker" onclick=removeOneMarker()>'),
          new GInfoWindowTab("Other",buildCoordString2(point))]
//////  comment next line out except when code resides on USGS system ///////////////////
//          + '<br><input type="button" value="Download GeoPDF USGS map" onclick=downloadUSGSmap()>'
      );


   }

   });

   usngmap.addOverlay(marker);
}

function removeOneMarker() {
  // global variable 'this marker' is a workaround to delete a marker from within its own info window
  usngmap.removeOverlay(thismarker);
  usngmap.closeInfoWindow();
}


// html string that holds the content of the "standard" tab of an info window
// usng, D.M.mm, directions form, and set marker button
function buildCoordString1(point)  {
        var northamerica=1
        var ngCoords = LLtoUSNG(point.y,point.x, 5);
        var mgrsCoords = LLtoMGRS(point.y,point.x, 5);
	var utmcoords=[]
	var zone
 	LLtoUTM(point.y,point.x,utmcoords,0)
	zone = utmcoords[2]

        if (point.y>13 && point.y<90 && ((point.x<-46 && point.x>-180) || (point.x>169 && point.x<180))) { 
            northamerica = 1
        }
        else {
            northamerica = 0
        }

	// usng or mgrs coordinates
        if (northamerica) {
           latLngStr = "<i>USNG:</i> <b>" + ngCoords + "</b>";
        }
        else {
           latLngStr = "<i>MGRS:</i> <b>" + mgrsCoords + "</b>";
        }
	
        // degrees and decimal minutes
        latLngStr += "<br><br><i>D-M.m:</i><b> " + lat2dm(point.y)+", " + lon2dm(point.x) + "</b><br>"

       if (northamerica) {
          latLngStr += '<br>Directions to this point from:'
          + '<br>'+'<form action="javascript:getDirections()">'
          + '<input type="text" SIZE=40 MAXLENGTH=40 name="saddr" id="saddr" value="" />'
          + '<INPUT value="Go" type="SUBMIT">'
          + '<input type="hidden" id="daddr" value="'
	  +point.lat() + ',' + point.lng() 
          + '"/></form>'
       }
       else {
          latLngStr += '<br>'
       }

       return(latLngStr)
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
   // decimal degrees
   latLngStr += "<br><i>D.d:</i> " + point.y.toFixed(5) + ", " + point.x.toFixed(5)
	// GARS
	latLngStr += "<br><i>GARS:</i> " + LLtoGARS(point.y,point.x)
   
   latLngStr += '<br>'
  
   latLngStr += '<font size="2">URL to this location:</font><br>';
   latLngStr += '<font size="1">http://dhost.info/usngweb?usng='
   latLngStr += mgrsCoords + '&disp=h&zoom=17</font>'

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

function getDirections()
{
//alert("saddr="+document.getElementById("saddr").value+", "+"daddr="+document.getElementById("daddr").value)
     showDirections(document.getElementById("saddr").value,document.getElementById("daddr").value);
     usngmap.closeInfoWindow();
}



function createMarkerIcons() {
     iconYellow = new GIcon();
     iconYellow.image = "icons/iconYellow.png";
     iconYellow.iconSize = new GSize(12, 20);
     iconYellow.iconAnchor = new GPoint(6, 20);
     iconYellow.infoWindowAnchor = new GPoint(5, 1);

     iconCircle = new GIcon();
     iconCircle.image = "icons/iconCircle.png";
     iconCircle.iconSize = new GSize(12, 12);
     iconCircle.iconAnchor = new GPoint(6, 6);
     iconCircle.infoWindowAnchor = new GPoint(6,6);

     iconRectangle = new GIcon();
     iconRectangle.image = "icons/rectangle.png";
     iconRectangle.iconSize = new GSize(40,20);
     iconRectangle.iconAnchor = new GPoint(20,10);
//     iconRectangle.infoWindowAnchor = new GPoint(20,10);

     icon100k_1 = new GIcon();
     icon100k_1.image = "icons/label100k.png";
     icon100k_1.iconSize = new GSize(30,20);
     icon100k_1.iconAnchor = new GPoint(20,10);

     icon100k_2 = new GIcon();
     icon100k_2.image = "icons/label100k.png";
     icon100k_2.iconSize = new GSize(60,20);
     icon100k_2.iconAnchor = new GPoint(20,10);

     icon1k = new GIcon();
     icon1k.image = "icons/label1k.png";
     icon1k.iconSize = new GSize(24,20);
     icon1k.iconAnchor = new GPoint(10,10);

     icon100m = new GIcon();
     icon100m.image = "icons/label100m.png";
     icon100m.iconSize = new GSize(33,33);
     icon100m.iconAnchor = new GPoint(14,14);

     iconGarsCells = new GIcon();
     iconGarsCells.image = "icons/labelGarsCells.png";
     iconGarsCells.iconSize = new GSize(60,20);
     iconGarsCells.iconAnchor = new GPoint(25,10);

     iconGarsQuads = new GIcon();
     iconGarsQuads.image = "icons/labelGarsQuads.png";
     iconGarsQuads.iconSize = new GSize(70,20);
     iconGarsQuads.iconAnchor = new GPoint(25,10);

     iconGarsKeys = new GIcon();
     iconGarsKeys.image = "icons/labelGarsKeys.png";
     iconGarsKeys.iconSize = new GSize(80,20);
     iconGarsKeys.iconAnchor = new GPoint(25,10);
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
 
// convert a latitude to deg and decimal minutes
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
 
// convert a latitude to deg-min-sec
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
