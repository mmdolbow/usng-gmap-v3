
// ***************************************************************************
// *  garslines.js  
//        calculate and display Global Area Reference System (GARS) 
//        zones and lines on a Google Maps display
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
//*****************************************************************************
//
// this module is modeled directly on the module 'gridlines.js', which calculates
// and draws U.S. National Grid lines.  gridlines.js was written first; garslines.js
// a year or so later


var x1;
var y1;


///////////////////////  begin class garsviewport ///////////////////////////////////////
//
// class that keeps track of the viewport context
// unlike most of the other classes in this module, does *not* implement 
//         a Google Maps custom overlay
// stores the corner coordinates of the viewport, and coordinate information
//     that defines the top-level MGRS/USNG zones within the viewport
// garsviewport is a geographic rectangle (bounded by parallels and meridians).  
//     zone lines and grid lines are computed within and clipped to this rectangle


function garsviewport(mygmap,level) {   
   // 'mygmap' is an instance of GMap2, created by calling function
   // 'level' is one of:
   //       1 = 30-min cells
   //       2 = 15-min quadrangles
   //       3 = 3-min keypad cells
   
    //    var interval=0;

    if (level == 1) { this.interval = 0.5; }
    else if (level == 2) { this.interval = 0.25; }
    else if (level == 3) { this.interval = 0.25/3; } 


   // arrays that hold the key coordinates...corners of viewport and UTM zone boundary intersections
   this.lat_coords = new Array();
   this.lng_coords = new Array();

   // array that holds instances of the class gars_georectangle, for this viewport
   this.georectangle = new Array();

   // call to Google Maps to get the boundaries of the map
   this.bounds = mygmap.getBounds();
   // geographic coordinates of edges of viewport
   this.slat = this.bounds.getSouthWest().lat();
   this.wlng = this.bounds.getSouthWest().lng();
   this.nlat = this.bounds.getNorthEast().lat();
   this.elng = this.bounds.getNorthEast().lng();

   // UTM is undefined beyond 84N or 80S, so this application defines viewport at those limits
   // the GARS system actually goes to the poles, but on a Mercator display this is problematic
   // UTM limits are used arbitrarily for consistency within this application
   if (this.nlat > 84) { this.nlat=84; }  

   // first zone intersection inside the southwest corner of the map window
   // longitude coordinate is straight-forward...
   var x1 = (Math.floor((this.wlng/this.interval)+1)*this.interval)

   // but latitude coordinate has three cases
   if (this.slat < -80) {  // far southern zone; limit of UTM definition
      y1 = -80
   }
   else { 
       var y1 = (Math.floor((this.slat/this.interval)+1)*this.interval)
   }

   // compute lines of GARS zones -- geographic lines at 30 min intervals

   // local variables
   var j, lat, lng;

   // compute the latitude coordinates that belong to this viewport
   if (this.slat < -80) { this.lat_coords[0] = -80 }  // special case of southern limit
   else { this.lat_coords[0] = this.slat }  // normal case

   for (lat=y1, j=1; lat < this.nlat; lat+=this.interval, j++) {
         this.lat_coords[j] = lat;
   }
   this.lat_coords[j] = this.nlat

   // compute the longitude coordinates that belong to this viewport
   this.lng_coords[0] = this.wlng;
   if (this.wlng < this.elng) {   // normal case
      for (lng=x1, j=1; lng < this.elng; lng+=this.interval, j++) {
         this.lng_coords[j] = lng;
      }
   }
   else { // special case of window that includes the international dateline
      for (lng=x1, j=1; lng <= 180; lng+=this.interval, j++) {
         this.lng_coords[j] = lng;
      }
      for (lng=-180; lng < this.elng; lng+=this.interval, j++) {
         this.lng_coords[j] = lng;
      }
   }

   this.lng_coords[j++] = this.elng;

   // store corners and center point for each geographic rectangle in the viewport
   // each rectangle may be a full GARS cell, but more commonly will have one or more
   //    edges bounded by the extent of the viewport
   // these geographic rectangles are stored in instances of the class 'gars_georectangle'
   var k = 0
   for (i=0; i<this.lat_coords.length-1; i++) {
      for (j=0; j<this.lng_coords.length-1; j++) {
         this.georectangle[k] = new gars_georectangle()
         this.georectangle[k].assignCorners(this.lat_coords[i], this.lat_coords[i+1], this.lng_coords[j], this.lng_coords[j+1])
         if (this.lat_coords[i] != this.lat_coords[i+1]) {  // ignore special case of -80 deg latitude
               this.georectangle[k].assignCenter()
         }
         k++
      }
   }
} // end of function garsviewport()

// return array of latitude coordinates corresponding to lat lines
garsviewport.prototype.lats = function() {
   return this.lat_coords
}

// return array of longitude coordinates corresponding to lng lines
garsviewport.prototype.lngs = function() {
   return this.lng_coords
}

// return an array or georectangles associated with this viewprot
garsviewport.prototype.geoextents = function() {
   return this.georectangle
}

////////////////////// end class garsviewport /////////////////////////////////




///////////////////// class to draw GARS 30-min cell lines/////////////////////////


// garscellines is implemented as a Google Maps custom overlay

function garscellines(viewport,color,width,opacity) { 
   this.view = viewport
   this.color = color
   this.width = Math.floor(width*(3/4))
   this.opacity = opacity
   this.interval = viewport.interval;
}

garscellines.prototype = new GOverlay();

garscellines.prototype.initialize = function(map) {
   this.map_ = map
   this.lat_line = new Array()
   this.lng_line = new Array()
   this.temp1 = new Array()
   this.temp2 = new Array()
   this.temp3 = new Array()
   this.latlines = this.view.lats()
   this.lnglines = this.view.lngs()
   this.gzd_rectangles = this.view.geoextents()
   this.marker = new Array()


// creates polylines corresponding to 30-min cell lines using arrays of 
//           lat and lng points for the viewport
   for (var i=1; i<this.latlines.length; i++) {  
      for (var j=0; j<this.lnglines.length; j++) {   
         this.temp1[j] = new GLatLng(this.latlines[i],this.lnglines[j])
      }
      this.lat_line[i-1] = new GPolyline(this.temp1,this.color, this.width, this.opacity)
   }

   for (i=1; i<this.lnglines.length; i++) {
          for (j=0; j<this.latlines.length; j++) {
                this.temp2[j] = new GLatLng(this.latlines[j],this.lnglines[i])
          }
          this.lng_line[i-1] = new GPolyline(this.temp2,this.color, this.width, this.opacity)

   }  // for each latitude line

}  // function initialize



garscellines.prototype.remove = function() {
   // remove latitude lines
   for (var i=0; i<this.lat_line.length; i++) {
      this.map_.removeOverlay(this.lat_line[i])
   }

   // remove longitude lines
   for (i=0; i<this.lng_line.length; i++) {
      this.map_.removeOverlay(this.lng_line[i])
   }
   // remove center-point label markers
   if (this.marker) {
      for (i=0; i<this.marker.length; i++) {
         this.map_.removeOverlay(this.marker[i])
      }
   }
} 

garscellines.prototype.cellmarkerremove = function() {
   // remove center-point label markers
   if (this.marker) {
      for (i=0; i<this.marker.length; i++) {
         this.map_.removeOverlay(this.marker[i])
      }
   }
}

// required function for google custom overlays; not needed for this application
garscellines.prototype.copy = function () {  }

// google custom overlays require a redraw function, but this application treats overlays
//    differently than the interface intended.  redraw is a dummy function; zonedraw is the
//    real function, but calls to it must be managed by the application, not the underlying api
garscellines.prototype.redraw = function () { return; }

// draw 30-min cell lines
garscellines.prototype.zonedraw = function() {
   // draw latitude lines
   for (var i=0; i<this.lat_line.length; i++) {
      if (i>0) {
         this.map_.addOverlay(this.lat_line[0])   // bug...don't understand why this is necessary
         this.map_.addOverlay(this.lat_line[i-1])
      }
   }

   // draw longitude lines
   for (i=0; i<this.lng_line.length; i++) {
      if (i>0) {
         this.map_.addOverlay(this.lng_line[0])   // bug...don't understand why this is necessary
         this.map_.addOverlay(this.lng_line[i-1])
      }
   }
}

// 30-min cell label markers
garscellines.prototype.cellmarkerdraw = function() {
   for (var i=0; i<this.gzd_rectangles.length; i++) {
      lat = this.gzd_rectangles[i].getCenter().lat()
      lng = this.gzd_rectangles[i].getCenter().lng()

       // labeled marker
       var z = LLtoGARS(lat,lng)

      if (this.interval == 0.5) {
          z = z.substring(0,5)
          opts = { 
             "icon": iconGarsCells,
             "clickable": false,
             "labelText": z,
             "labelOffset": new GSize(-22, -11)
          };
      }
      else if (this.interval == 0.25) {
          z = z.substring(0,6)
          opts = { 
             "icon": iconGarsQuads,
             "clickable": false,
             "labelText": z,
             "labelOffset": new GSize(-22, -11)
          };
      }

      else {
          z = z.substring(0,7)
          opts = { 
             "icon": iconGarsKeys,
             "clickable": false,
             "labelText": z,
             "labelOffset": new GSize(-22, -11)
          };
      }


       this.marker[i] = new LabeledMarker(new GLatLng(lat,lng),opts);
       this.map_.addOverlay(this.marker[i])
   }
}  

/////////////////end of class that draws 30-min cell lines///////////////////////////////







///////////////////////// class gars_georectangle//////////////////////////
function gars_georectangle() {
   this.nlat = 0
   this.slat = 0
   this.wlng=0
   this.elng=0
   this.centerlat=0
   this.centerlng=0
}

gars_georectangle.prototype.assignCorners = function(slat,nlat,wlng,elng) {
   this.nlat = nlat;
   this.slat = slat;
   this.wlng = wlng;
   this.elng = elng
}

gars_georectangle.prototype.assignCenter = function() {
      this.centerlat = (this.nlat+this.slat)/2;
      this.centerlng = (this.wlng+this.elng)/2;
}
gars_georectangle.prototype.getCenter = function() {
      return(new GLatLng(this.centerlat,this.centerlng))
}

gars_georectangle.prototype.getNW = function() {
      return(new GLatLng(this.nlat,this.wlng))
}
gars_georectangle.prototype.getSW = function() {
      return(new GLatLng(this.slat,this.wlng))
}
gars_georectangle.prototype.getSE = function() {
      return(new GLatLng(this.slat,this.elng))
}
gars_georectangle.prototype.getNE = function() {
      return(new GLatLng(this.nlat,this.elng))
}
//////////////////end class gars_georectangle////////////////////////////////

