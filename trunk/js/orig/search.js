// ***************************************************************************
// *  search.js
// *
// * This module contains most of the code for search and directions input forms
// * USGN coordinates are computed with calls to functions in usng.js
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


var lat_lines = []
var lng_lines = []
var directions

// zoom to either a street address or USNG string

function showAddress(address) {
  var thispoint;
  //  var usngstr;
  var geocoder = new GClientGeocoder();
  // parse the input string to determine if it is a cartographic coordinate of some kind
  if (thispoint = parseLocation(address)) {
      //alert("(debug) coordinates identified by this mashup: "+thispoint.x+", "+ thispoint.y);
      displayCoordMarker(thispoint.lat(),thispoint.lng(),14,"");
  }

  // if not a carto coordinate, let Google geocoder try
  else {
     geocoder.getLatLng(
       address,
       function(point) {
         if (!point) {
           alert(address + " - Address cannot be found");
         } 
         else {
           var location = address  + "<br><br>" 
	   //alert("(debug) trying the google geocoder..."+point.lat()+", "+point.lng());
           displayCoordMarker(point.lat(),point.lng(),14, location)
         }
       }
     );
  }
}


function showDirections(start,end) {
    var start_str;
    var end_str;
    var latlng;


   // parse the input strings to determine if it is a cartographic coordinate of some kind
   if (latlng = parseLocation(start)) {
        start_str = latlng.lat() + "," + latlng.lng()
   }
   else {
       start_str = start  // don't change the input 'start' string
   } 

   if (latlng = parseLocation(end)) {
        end_str = latlng.lat() + "," + latlng.lng()
   }
   else {
       end_str = end  // don't change the input 'end' string
   }

   // if the start and end strings are not identified as cartographic coordinates, pass 
   //    them unchanged to the Google geocoder, assuming they are street addresses
   // opens directions in new window with lat/lng values.  by using native google directions,
   //     leverages dragging of points along route
   window.open("http://maps.google.com/maps?saddr="+start_str+"&"+"daddr="+end_str);
}


// parses input strings to look for cartographic coordinate values
// do this first, before trying geocoding...if no coordinates identified, 
//    then the calling routine should send the input to the Google geocoder
// returns an instance of GLatLng if a cartographic coordinate is found
// otherwise returns 0
function parseLocation(aLocationString) {
  var usngstr;
  var LLnumbers;

  // case 1 -- usng or mgrs string
  if (usngstr = isUSNG(aLocationString)) {
      // convert USNG string to lat/lng
      return GUsngtoLL(usngstr) 
  }
  // case 2 -- lat,lng or lng,lat
  else if (LLnumbers = isLatLng(aLocationString)) {
      return LLnumbers;
  }

  else {
      return 0;
  }

}


function clearDirections() {
   directions.clear()
   document.getElementById("info").innerHTML = Info.VisibleText + Info.DefaultText
}


// show forms to get directions
function switchtoDirections() {
   document.getElementById("search_label").innerHTML = "Directions";
   document.getElementById("search_input").innerHTML = "<input type='text' size='30' name='from' value='' />"
         + " To<input type='text' size='30' name='to' value='' onChange='showDirections(form.from.value,form.to.value);switchtoDirections()'/>"
         + "<input type='button' value='Go' onclick=showDirections(form.from.value,form.to.value) />"
   document.getElementById("search_type").innerHTML = "<input type='button' value='Search'  onclick='switchtoSearch()' />"
         + "<input type='button' value='Directions' disabled='true' onclick='' />"

}


// show form to search for a location
function switchtoSearch() {
   document.getElementById("search_label").innerHTML = "Search";
   document.getElementById("search_input").innerHTML = "<input type='text' size='40' name='address' value='' onChange='showAddress(form.address.value);switchtoSearch()'/>"
         + "<input type='button' value='Go' onclick=showAddress(form.address.value) />"
   document.getElementById("search_type").innerHTML = "<input type='button' value='Search' disabled='true' onclick='' />"
         + "<input type='button' value='Directions'  onclick=switchtoDirections() />"
}



/////////////functions that parse and evaluate input coordinate strings///////////////
// isUSNG() is defined in the module usng.js
// functions that work with GARS coordinates are defined in the module gars.js
// coordinate-string parsing funcations for the various lat/lng formats are defined here

// checks a string to see if it is valid lat/lng
//    if so, returns a GLatLng [built-in of the Google Maps API]
//    if not, returns 0
function isLatLng(inputStr) {
   var j = 0;
   var k;
   var lng;
   var lat;
   var dmStr=[];
   var parts=[];
   var strregexp

   // convert all letters to upper case
   dmStr = inputStr.toUpperCase();

   // regular expression (RE) strings

   // beginning and end of string can be padded with spaces, but not with other characters
   var startRE = "^ *";
   var endRE = " *$";

   // degrees and decimal minutes; deg part and min part captured as variables 1 and 2; 
   //     decimal part of minutes captured as variable 3
   var decminRE = "([0-9]{0,3})[-| ]+([0-9]{1,2}(\.*[0-9]*)?)";

   // d-m-s; deg captured as variable 1, min as variable 2, seconds as variable 3
   var dmsRE =    "([0-9]{0,3})[-| ]+([0-9]{1,2})[-| ]+([0-9]{1,2}\.*[0-9]*)";

   // decimal degrees; entire real number captured as variable 1
   var sdecdegRE = "([0-9]{0,3}\.[0-9]*)";

   // decimal degrees; entire real number captured as variable 1
   var decdegRE = "([0-9]{0,3}\.[0-9]*)";

   // north and south latitude designators; one letter captured as a variable
   var nsRE = "([N|S]+)";

   // signed (+/-) to indicate quadrant; one symbol captured
   var signRE = "([\+|\-]*)";

   // east and west longitude designators; one letter captured as a variable
   var ewRE = "([W|E]+)";

   // delimiter between coordinates must be a comma or spaces; 
   //          any number of spaces allowed on either side of comma; no variables captured
   var delimiterRE = " *[\,| ]+ *"


   // case 1: d-m-s format
   // 1a: latitude/longitude, d-m-s format
       strregexp = new RegExp(startRE + dmsRE + nsRE + delimiterRE +dmsRE + ewRE + endRE)
   if (parts = dmStr.match(strregexp)) {
      lat = parts[1]*1+(parts[2]/60)+parts[3]/3600;
      lng = parts[5]*1+(parts[6]/60+parts[7]/3600);
      if (parts[4] == 'S') { lat *= -1; }
      if (parts[8] == 'W') { lng *= -1; }
      return(new GLatLng(lat,lng))
   }

   // 1b: longitude/latitude, d-m-s format
   strregexp = new RegExp(startRE + dmsRE + ewRE + delimiterRE +dmsRE + nsRE + endRE)
   if (parts = dmStr.match(strregexp)) {
      lat = parts[5]*1+(parts[6]/60+parts[7]/3600);
      lng = parts[1]*1+(parts[2]/60)+parts[3]/3600;
      if (parts[8] == 'S') { lat *= -1; }
      if (parts[4] == 'W') { lng *= -1; }
      return(new GLatLng(lat,lng))
   }


   // case 2: ddd-mm.mmm format
   // 2a: latitude/longitude, ddd-mm.mmmQ format
   strregexp = new RegExp(startRE + decminRE + nsRE + delimiterRE +decminRE + ewRE + endRE)
   if (parts = dmStr.match(strregexp)) {
      // parts[0] is the entire string dmStr
      // multiply by 1 to convert string to number
      lat = parts[1]*1+(parts[2]/60);
      lng = parts[5]*1+(parts[6]/60);
      if (parts[4] == 'S') { lat *= -1; }
      if (parts[8] == 'W') { lng *= -1; }
      return(new GLatLng(lat,lng))
   }

   // 2b: longitude/latitude, ddd-mm.mmmQ format
   strregexp = new RegExp(startRE + decminRE + ewRE + delimiterRE +decminRE + nsRE + endRE)
   if (parts = dmStr.match(strregexp)) {
      lat = parts[5]*1+(parts[6]/60);
      lng = parts[1]*1+(parts[2]/60);
      if (parts[8] == 'W') { lat *= -1; }
      if (parts[4] == 'S') { lng *= -1; }

      return(new GLatLng(lat,lng))
   }

   // case 3: signed ddd-mm.mmm format
   // latitude MUST be first in this format
   strregexp = new RegExp(startRE + signRE + decminRE + delimiterRE + signRE + decminRE + endRE)
   if (parts = dmStr.match(strregexp)) {
	   //multiply by 1 to convert string to number
      lat = parts[2]*1+(parts[3]/60);
      lng = parts[6]*1+(parts[7]/60);
      if (lat >=90 ) { return 0 };   // lat/lng probably in wrong order
      if (parts[1] == '-') { lat *= -1; }
      if (parts[5] == '-') { lng *= -1; }

      return(new GLatLng(lat,lng))
   }


   // case 4: signed ddd-mm-ss.ss format
   // latitude MUST be first in this format
//   strregexp = new RegExp(startRE + signRE + dmsRE + delimiterRE + signRE + dmsRE + endRE)
//   if (parts = dmStr.match(strregexp)) {
	   // parts[0] is the entire string dmStr
	   //multiply by 1 to convert string to number
//      lat = parts[2]*1+(parts[3]/60)+parts[4]/3600;
//      lng = parts[6]*1+(parts[7]/60)+parts[8]/3600;
//      if (lat >=90 ) { return 0 };   // lat/lng probably in wrong order
//      if (parts[1] == '-') { lat *= -1; }
//      if (parts[5] == '-') { lng *= -1; }

//      return(new GLatLng(lat,lng))
//   }


   // case 5: decimal degrees with letter format
   // 5a: latitude/longitude, D.dddQ format
   strregexp = new RegExp(startRE + decdegRE + nsRE + delimiterRE +decdegRE + ewRE + endRE)
   if (parts = dmStr.match(strregexp)) {
      // parts[0] is the entire string dmStr
      // multiply by 1 to convert string to number
      lat = parts[1]*1;
      lng = parts[3]*1;
      if (parts[2] == 'S') { lat *= -1; }
      if (parts[4] == 'W') { lng *= -1; }

      return(new GLatLng(lat,lng))
   }

   // 5b: longitude/latitude, D.ddQ format
   strregexp = new RegExp(startRE + decdegRE + ewRE + delimiterRE +decdegRE + nsRE + endRE)
   if (parts = dmStr.match(strregexp)) {
      lat = parts[3]*1;
      lng = parts[1]*1;
      if (parts[4] == 'S') { lat *= -1; }
      if (parts[2] == 'W') { lng *= -1; }

      return(new GLatLng(lat,lng))
   }


   // case 6: signed decimal degrees format
   // latitude MUST be first in this format
   strregexp = new RegExp(startRE + signRE + sdecdegRE + delimiterRE + signRE + sdecdegRE +endRE)
   if (parts = dmStr.match(strregexp)) {
	   // parts[0] is the entire string
	   //multiply by 1 to convert string to number
      lat = parts[2]*1;
      lng = parts[4]*1;
      if (lat >=90 ) { return 0 };   // lat/lng probably in wrong order
      if (parts[1] == '-') { lat *= -1; }
      if (parts[3] == '-') { lng *= -1; }
      return(new GLatLng(lat,lng))
    }

   // no match for any lat/lng format
   return 0;

}



