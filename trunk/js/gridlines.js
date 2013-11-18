/**
*  gridlines.js (calculate and display U.S. National Grid zones and gridlines)
*
****************************************************************************
 *
 * Originally by Larry Moore
 * Updated for version 3 of the Google Maps API by Mike Dolbow
 * Assisted by code developed by Xavier Irias for Marconi Mapper
 * 
 * HAS:
 * 1. All GLatLng replaced with google.maps.LatLng
 * 2. Width and Opacity on PolyLines switched with Opacity and Width
 * 3. All GPolyline replaced with google.maps.Polyline
 * 4. new GOverlay(); lines replaced with new google.maps.OverlayView();
 * 5. Added this.lat_line[i-1].setMap(this.map); and this.lng_line[i-1].setMap(this.map); For Zone Lines
 * 6. Replaced all prototype.remove with prototype.onRemove. Cleaned up some leftover Larry code for zones
 * 7. Figured out prototype.lats and prototype.lngs functions not consistently working, trying 
 *    lat_coords, and lng_coords, instead, in certain places
 * 8. Succeeded in getting zone lat and long lines added to the map with array definitions in onAdd and looping through with draw
 * 		In the draw function, we MUST reset the "temp" arrays INSIDE the for...loop of the original lat lines so that it can be emptied and used for new polyline paths
 * 		The usng_georectangle class is fine, the zone marker function just can't be called before the full zone class is instantiated and added
 * 9. Markers for zone labels are working via http://google-maps-utility-library-v3.googlecode.com/svn/tags/markerwithlabel/
 * 10. New USNGGraticule method partially implemented
 *     Successfully converted some variable definitions in Gridcell.prototype.drawOneCell function to using Jim's methods
 * 		N-S and E-W lines and labels now appear to be successfully drawn in most cases
 * 11. Commented out MARCONI.stdlib.fixedFormatNumber sections; without that code I don't know what that does. Merely used the x or the y available
 * 12. Used Jim's script for guidance on precision, wehre precision indicates the number of digits used
 *      per coordinate: 0 = 100km, 1 = 10km (not used), 2 = 1km, 3 = 100m, 4 = 10m (not used). This is passed to the GridCell functions now
 * 13. Using the middle coordinate of the cell to determine the zone. Still need to resolve what happens when multiple zones are in play
 * 14. Figured out why longitudes were not being added to the eastings array because they weren't
 *     within an appropriate range. No wonder, since we had the easting and northing switched!
 * 15. Fixed the 100k labels, changed the scale dependency on the 100m labels so they don't draw at 14 or lower
 * 
 * NEEDS:
 * 
 * - Need to figure out why zone labels aren't added between ~10 and 15 zoom
 * - More work with zone lines and zone markers, particularly after they are on and the map bounds change:
 *    With zoom out or pan, we need to redraw. With zoom in, we need to NOT redraw.
 * - Better performance on the zone lines and labels on zoom/pan events 
 * - Need to investigate impacts of killing MARCONI.stdlib.fixedFormatNumber
 * - Need better stylings of lines and labels. Use zonemarkerdraw function and main.css to style them
 * - Need to figure out why non-zone n-s and e-w lines and labels aren't drawing when a wide screen is used
 * - Better understanding of when to use or not use the superscript 00's on the 100m labels
 * - Y-axis and/or X-axis 100m labels appear to be off by one when compared to markers, depending on where you are
 * */


var x1;
var y1;


/////////////////////// begin class USNG Graticule //////////////////////////////////////////
function USNGGraticule(map,gridStyle) {
    var that=this;
    
    //alert("usng grid constructor");
    if(!map  ) {
        throw "Must supply map to the constructor";
    }
    this._map = map;
    
    this.gridStyle = gridStyle; //Xavier original. Below is attempt to reset to Larry's style
    //this.gridStyle = {majorLineColor:zonelinecolor,majorLineOpacity:zonelineopacity,majorLineWeight:zonelinewidth};
    this.setMap(map);  // will trigger a draw()
    
    // Google API should call draw() on its own at various times but often fails to
    // so put our own listeners in.  
    
    this.resizeListener = google.maps.event.addDomListener(window, "resize", function() {that.draw();});  
    this.dragListener = google.maps.event.addListener(map, 'dragend', function() { that.draw(); });
              
}

//USNG Graticule Prototype
USNGGraticule.prototype = new google.maps.OverlayView();

//dummy onAdd function. Like Larry, Xavier had this as an empty function, although Larry did this for each type
USNGGraticule.prototype.onAdd= function() {};

//USNG Graticule Remov
USNGGraticule.prototype.onRemove = function(leaveHandlersAlone) {
    try {
        if( this.zoneLines ) {
            this.zoneLines.remove();
            this.zoneLines = null;
        }
        if( this.grid100k) {
            this.grid100k.remove();
            this.grid100k = null;
        }

        if( this.grid1k) {
            this.grid1k.remove();
            this.grid1k = null;
        }

        if( this.grid100m ) {
            this.grid100m.remove();
            this.grid100m = null;
        }
        
        if( leaveHandlersAlone!==true ) {
            google.maps.event.removeListener(this.resizeListener);
            google.maps.event.removeListener(this.dragListener);
        }
        
    
	}
    catch(e) {
        console.log("Error " + e + " removing USNG graticule");
    }
}

//USNG Graticule Draw. Defines styles based on the current map zoom level
USNGGraticule.prototype.draw = function() {
    try {
        this.onRemove(true);
        this.view = new usngviewport(this._map);

        var zoomLevel = this._map.getZoom();  // zero is whole world, higher numbers (to about 20 are move detailed)

        if( zoomLevel < 6 ) {   // zoomed way out
            this.zoneLines = new USNGZonelines(this._map, this.view, this,
            this.gridStyle.majorLineColor,
            this.gridStyle.majorLineWeight,
            this.gridStyle.majorLineOpacity);
        }
        else {  // close enough to draw the 100km lines
            this.grid100k = new Grid100klines(this._map, this.view, this,
                this.gridStyle.semiMajorLineColor,
                this.gridStyle.semiMajorLineWeight,
                this.gridStyle.semiMajorLineOpacity);
            
            if(zoomLevel > 10 ) {    // draw 1k lines also if close enough
                this.grid1k = new Grid1klines(this._map, this.view, this,
                this.gridStyle.minorLineColor,
                this.gridStyle.minorLineWeight,
                this.gridStyle.minorLineOpacity);
                
                if( zoomLevel > 13 ) {   // draw 100m lines if very close
                    this.grid100m = new Grid100mlines(this._map, this.view, this,
                    this.gridStyle.fineLineColor,
                    this.gridStyle.fineLineWeight,
                    this.gridStyle.fineLineOpacity);
                }
            }
        }
    }
    catch(ex) {
        console.log("Error " + ex + " drawing USNG graticule");
    }
};

//not sure of the purpose here so temp comment out
/*
USNGGraticule.prototype.gridValueFromPt = function(latLongPt) {
    return USNG.LLtoUSNG(latLongPt.lat(), latLongPt.lng());
};
*/

/////////////////////// end class USNG Graticule //////////////////////////////////////////


///////////////////////  begin class usngviewport ///////////////////////////////////////
//
// class that keeps track of the viewport context
// unlike most of the other classes in this module, does *not* implement a Google Maps custom overlay
// stores the corner coordinates of the viewport, and coordinate information
//     that defines the top-level MGRS/USNG zones within the viewport
// usngviewport is a geographic rectangle (bounded by parallels and meridians).  zone lines and
//     grid lines are computed within and clipped to this rectangle

function usngviewport(mygmap) {   // mygmap is an instance of google.map, created by calling function

   // arrays that hold the key coordinates...corners of viewport and UTM zone boundary intersections
   //console.log("Inside the usngviewport function.");
   this.lat_coords = new Array();
   this.lng_coords = new Array();

   // array that holds instances of the class usng_georectangle, for this viewport
   this.georectangle = new Array();

   // call to Google Maps to get the boundaries of the map
   this.bounds = mygmap.getBounds();
   // geographic coordinates of edges of viewport
   this.slat = this.bounds.getSouthWest().lat();
   this.wlng = this.bounds.getSouthWest().lng();
   this.nlat = this.bounds.getNorthEast().lat();
   this.elng = this.bounds.getNorthEast().lng();

   // UTM is undefined beyond 84N or 80S, so this application defines viewport at those limits
   if (this.nlat > 84) { this.nlat=84; }  

   // first zone intersection inside the southwest corner of the map window
   // longitude coordinate is straight-forward...

   var x1 = (Math.floor((this.wlng/6)+1)*6.0);

   // but latitude coordinate has three cases
   if (this.slat < -80) {  // far southern zone; limit of UTM definition
      y1 = -80;
   }
   else { 
       var y1 = (Math.floor((this.slat/8)+1)*8.0);
   }

   // compute lines of UTM zones -- geographic lines at 6x8 deg intervals

   // local variables
   var j, lat, lng;

   // compute the latitude coordinates that belong to this viewport
   if (this.slat < -80) { this.lat_coords[0] = -80 }  // special case of southern limit
   else { this.lat_coords[0] = this.slat }  // normal case

   for (lat=y1, j=1; lat < this.nlat; lat+=8, j++) {
      if (lat <= 72) {
         this.lat_coords[j] = lat;
      }
      else if (lat <= 80) {
         this.lat_coords[j] = 84;
      }
      else { j-- }
   }
   this.lat_coords[j] = this.nlat;

   // compute the longitude coordinates that belong to this viewport
   this.lng_coords[0] = this.wlng;
   if (this.wlng < this.elng) {   // normal case
      for (lng=x1, j=1; lng < this.elng; lng+=6, j++) {
         this.lng_coords[j] = lng;
      }
   }
   else { // special case of window that includes the international dateline
      for (lng=x1, j=1; lng <= 180; lng+=6, j++) {
         this.lng_coords[j] = lng;
      }
      for (lng=-180; lng < this.elng; lng+=6, j++) {
         this.lng_coords[j] = lng;
      }
   }

   this.lng_coords[j++] = this.elng;

   // store corners and center point for each geographic rectangle in the viewport
   // each rectangle may be a full UTM cell, but more commonly will have one or more
   //    edges bounded by the extent of the viewport
   // these geographic rectangles are stored in instances of the class 'usng_georectangle'
   var k = 0;
   for (i=0; i<this.lat_coords.length-1; i++) {
      for (j=0; j<this.lng_coords.length-1; j++) {
         if (this.lat_coords[i]>=72 && this.lng_coords[j]==6) {  } // do nothing
         else if (this.lat_coords[i]>=72 && this.lng_coords[j]==18) {  } // do nothing
         else if (this.lat_coords[i]>=72 && this.lng_coords[j]==30) {  } // do nothing
         else {
            this.georectangle[k] = new usng_georectangle();
            //console.log("After declaring georectangle, corners will be: "+this.lat_coords[i]+", "+this.lat_coords[i+1]+", "+this.lng_coords[j]+", "+this.lng_coords[j+1]);
            this.georectangle[k].assignCorners(this.lat_coords[i], this.lat_coords[i+1], this.lng_coords[j], this.lng_coords[j+1]);
            if (this.lat_coords[i] != this.lat_coords[i+1]) {  // ignore special case of -80 deg latitude
               this.georectangle[k].assignCenter();
            }
            k++;
         }
      }
   }
} // end of function usngviewport()

// return array of latitude coordinates corresponding to lat lines
usngviewport.prototype.lats = function() {
   return this.lat_coords;
}

// return array of longitude coordinates corresponding to lng lines
usngviewport.prototype.lngs = function() {
   return this.lng_coords;
}

// return an array or georectangles associated with this viewprot
usngviewport.prototype.geoextents = function() {
   return this.georectangle;
}

////////////////////// end class usngviewport /////////////////////////////////



///////////////////// class to draw UTM zone lines/////////////////////////

// zones are defined by lines of latitude and longitude, normally 6 deg wide by 8 deg high
// northern-most zone is 12 deg high, from 72N to 84N


function USNGZonelines(map, viewport, parent) {
    try {
       this._map = map;
       this.view = viewport;
       this.parent=parent;
       

       this.lat_line = [];
       this.lng_line = [];

       var latlines = this.view.lats();
       var lnglines = this.view.lngs();
       this.gzd_rectangles = this.view.geoextents();
       //console.log("We have this many GZD rectangles: "+this.gzd_rectangles.length);
       this.marker = [];
       var temp = [];
       var i;

       // creates polylines corresponding to zone lines using arrays of lat and lng points for the viewport
       for( i = 1 ; i < latlines.length ; i++) {
           temp=[];

           for (var j = 0 ; j < lnglines.length; j++) {
               temp.push(new google.maps.LatLng(latlines[i],lnglines[j]));
           }


           this.lat_line.push(new google.maps.Polyline({
              path: temp, 
              strokeColor: this.parent.gridStyle.majorLineColor,
              strokeWeight: this.parent.gridStyle.majorLineWeight,
              strokeOpacity: this.parent.gridStyle.majorLineOpacity, map: this._map
            }));
       }

       

       for( i = 1 ; i < lnglines.length ; i++ ) {
           // need to reset array for every line of longitude!
           temp = [];

           // deal with norway special case at longitude 6
           if( lnglines[i] == 6 ) {
              for( j = 0 ; j < latlines.length ; j++ ) {
                 if (latlines[j]==56) {
                    temp.push(new google.maps.LatLng(latlines[j], lnglines[i]));
                    temp.push(new google.maps.LatLng(latlines[j], lnglines[i]-3));
                 }
                 else if( latlines[j]<56 || (latlines[j]>64 && latlines[j]<72)) {
                    temp.push(new google.maps.LatLng(latlines[j], lnglines[i]));
                 }
                 else if (latlines[j]>56 && latlines[j]<64) {
                    temp.push(new google.maps.LatLng(latlines[j],lnglines[i]-3));
                 }
                 else if (latlines[j]==64) {
                    temp.push(new google.maps.LatLng(latlines[j], lnglines[i]-3));
                    temp.push(new google.maps.LatLng(latlines[j], lnglines[i]));
                 }
                 // Svlabard special case
                 else if (latlines[j]==72) {
                    temp.push(new google.maps.LatLng(latlines[j], lnglines[i]));
                    temp.push(new google.maps.LatLng(latlines[j], lnglines[i]+3));
                 }
                 else if (latlines[j]<72) {
                    temp.push(new google.maps.LatLng(latlines[j], lnglines[i]));
                 }
                 else if (latlines[j]>72) {
                    temp.push(new google.maps.LatLng(latlines[j], lnglines[i]+3));
                  }
                 else {
                    temp.push(new google.maps.LatLng(latlines[j],lnglines[i]-3));
                 }
                }
       
            }

           // additional Svlabard cases

           // lines at 12,18 and 36 stop at latitude 72
           else if (lnglines[i] == 12 || lnglines[i] == 18 || lnglines[i] == 36) {
              for (j = 0; j < latlines.length; j++) {
                 if (latlines[j]<=72) {
                    temp.push(new google.maps.LatLng(latlines[j], lnglines[i]));
                 }
              }
          }
          else if (lnglines[i] == 24) {
              for (j=0; j < latlines.length ; j++) {
                 if (latlines[j] == 72) {
                    temp.push(new google.maps.LatLng(latlines[j], lnglines[i]));
                    temp.push(new google.maps.LatLng(latlines[j], lnglines[i]-3));
                 }
                 else if ( latlines[j] < 72) {
                    temp.push(new google.maps.LatLng(latlines[j],lnglines[i]));
                 }
                 else if ( latlines[j] > 72) {
                    temp.push(new google.maps.LatLng(latlines[j],lnglines[i]-3));
                 }
              }
          }
           else if (lnglines[i] == 30) {
              for ( j = 0 ; j < latlines.length ; j++) {

                 if( latlines[j] == 72 ) {
                    temp.push(new google.maps.LatLng(latlines[j], lnglines[i]));
                    temp.push(new google.maps.LatLng(latlines[j], lnglines[i]+3));
                 }
                 else if ( latlines[j] < 72 ) {
                    temp.push(new google.maps.LatLng( latlines[j], lnglines[i]));
                 }
                 else if ( latlines[j] > 72 ) {
                    temp.push(new google.maps.LatLng( latlines[j], lnglines[i]+3));
                 }
              }
          }
      
          // normal case, not in Norway or Svalbard
          else {
              for( j = 0 ; j < latlines.length; j++) {
                  temp.push(new google.maps.LatLng(latlines[j], lnglines[i]));
              }
          }

          this.lng_line.push(new google.maps.Polyline({path:temp, 
              strokeColor: this.parent.gridStyle.majorLineColor,
              strokeWeight: this.parent.gridStyle.majorLineWeight,
              strokeOpacity: this.parent.gridStyle.majorLineOpacity,
              map: this._map}));
          
        }  // for each latitude line


        this.zonemarkerdraw();
    }
    catch(ex) {
        throw("Error drawing USNG zone boundaries: " + ex);
    }
}  // constructor

USNGZonelines.prototype.remove = function() {
    try {
        var i;

        if( this.lat_line ) {

          for(i=0; i< this.lat_line.length; i++) {
              this.lat_line[i].setMap(null);
          }
          this.lat_line = null;
        }

        if( this.lng_line ) {

            for(i=0; i< this.lng_line.length; i++) {
                this.lng_line[i].setMap(null);
            }
            this.lng_line = null;
        }

        // remove center-point label markers
        if (this.marker) {
            for (i=0; i<this.marker.length; i++) {
               this.marker[i].parentNode.removeChild(this.marker[i]);
            }
            this.marker=null;
        }
    }
    catch(ex) {
        alert("Error removing zone lines: " + ex);
    }
} 

// zone label markers
USNGZonelines.prototype.zonemarkerdraw = function() {
    function makeLabel(parent, latLong, labelText, className) {
        try {
            
            var pixelPoint = parent.getProjection().fromLatLngToDivPixel(latLong);

            var d = document.createElement("div");
            var x = pixelPoint.x;
            var y = pixelPoint.y;
            var height=15;
            var width=30;

            d.style.position = "absolute";
            d.style.width  = "" + width + "px";
            d.style.height = "" + height + "px";

            d.innerHTML = labelText;

            if( className ) {
                d.className = className;
            }
            else {
                d.style.color = "#000000";
                d.style.fontFamily='Arial';
                d.style.fontSize='small';
                d.style.backgroundColor = "white";
                d.style.opacity=0.5;
            }

            d.style.textAlign = "center";
            d.style.verticalAlign = "middle";
            d.style.left = (x-width*.5).toString() + "px";
            d.style.top  = (y-height*.5).toString() + "px";

            if( parent && parent.getPanes && parent.getPanes().overlayLayer ) {
                parent.getPanes().overlayLayer.appendChild(d);
            }
            else {
                console.log("Warning: parent is " + parent + " drawing label");
            }

            return d;
        }
        catch(ex) {
            throw "Error making zone label " + labelText + ": " + ex;
        }
    }

    for (var i = 0 ; i <this.gzd_rectangles.length; i++ ) {

        var zonemarkerlat = this.gzd_rectangles[i].getCenter().lat();

        var zonemarkerlng = this.gzd_rectangles[i].getCenter().lng();

        // labeled marker
        var z = usngfunc.fromLonLat({lon:zonemarkerlng,lat:zonemarkerlat},1);

        z = z.substring(0,3);

        this.marker.push(makeLabel(this.parent, this.gzd_rectangles[i].getCenter(), z, this.parent.gridStyle.majorLabelClass));
        
    }
}  

/////////////////end of class that draws zone lines///////////////////////////////

///////////////////// class to draw 100,000-meter grid lines/////////////////////////
//Works by passing an "interval of 100,000" to the Gridcell function
	
function Grid100klines(map, viewport, parent) {
	//console.log("Grid100klines func launched.")
    this._map = map;
    this.view = viewport;
    this.parent = parent;
    
    this.Gridcell_100k = [];

    
    // zone lines are also the boundaries of 100k lines...separate instance of this class for 100k lines
    this.zonelines = new USNGZonelines(this._map, this.view, parent);
    
    this.zones = this.view.geoextents();

    for (var i=0; i < this.zones.length; i++) {
        var newCell = new Gridcell(this._map, this.parent, this.zones[i],100000,0);

        this.Gridcell_100k.push(newCell);

        newCell.drawOneCell();
    }
}

Grid100klines.prototype.remove = function() {
    try {
        if( this.zonelines ) {
           this.zonelines.remove();
        }

        if( this.Gridcell_100k ) {
            for (var i=0; i < this.Gridcell_100k.length; i++) {
                this.Gridcell_100k[i].remove();
            }

            this.Gridcell_100k = null;
        }
    }
    catch(ex) {
        alert("Error " + ex + " trying to remove 100k gridlines");
    }
}

/////////////end class Grid100klines ////////////////////////////////////////

///////////////////// class to draw 1,000-meter grid lines/////////////////////////
//Works by passing an "interval of 1000" to the Gridcell function

function Grid1klines(map, viewport, parent) {
    this._map = map;
    this.view = viewport;
    this.parent = parent;
    

    this.Gridcell_1k = [];
   
    this.zones = this.view.geoextents();

    for (var i = 0 ; i < this.zones.length ; i++ ) {
        this.Gridcell_1k[i] = new Gridcell(this._map, this.parent, this.zones[i], 1000,2); //MD 10.23.2013 Originally used a 2 precision, what if I change it?
        this.Gridcell_1k[i].drawOneCell();
    }
}

Grid1klines.prototype.remove = function() {
    // remove 1k grid lines
    for (var i=0; i<this.zones.length; i++) {
       this.Gridcell_1k[i].remove();
    }
    this.Gridcell_1k = null;
}


/////////////end class Grid1klines ////////////////////////////////////////


///////////////////// class to draw 100-meter grid lines/////////////////////////
//Works by passing an "interval of 100" to the Gridcell function
function Grid100mlines(map, viewport, parent) {
    this._map = map;
    this.view = viewport;
    this.parent = parent;
    

    this.Gridcell_100m = [];
    this.zones = this.view.geoextents();

    for (var i=0; i<this.zones.length; i++) {
       this.Gridcell_100m[i] = new Gridcell(this._map, this.parent, this.zones[i], 100,3);
       this.Gridcell_100m[i].drawOneCell();
    }
}

Grid100mlines.prototype.remove = function() {
   // remove 100-m grid lines
   for (var i = 0 ; i < this.zones.length ; i++) {
      this.Gridcell_100m[i].remove();
   }
}

/////////////end class Grid100mlines ////////////////////////////////////////


///////////////////// class to calculate and draw "Gridcell" grid lines ///////////////////////
//Handles 100,000m, 1,000m, and 100m grids, depending on the interval passed

// constructor
function Gridcell(map, parent, zones,interval,gridprecision) {
	//console.log("Defining a GridCell at interval: "+interval+", gridprecision: "+gridprecision);
    if(!map) {
        throw "map argument not supplied to Gridcell constructor";
    }
    if(!parent) {
        // TODO -- check some properties of parent to make sure it's real
        throw "parent USNG grid not supplied to Gridcell constructor";
    }

    this._map   = map;
    this.parent = parent;   // provides access to gridStyle for example. Will likely need to replace with Larry's or other styles --MMD
    this.slat   = zones.slat;
    this.wlng   = zones.wlng;
    this.nlat   = zones.nlat;
    this.elng   = zones.elng;

    this.interval   = interval;
    this.gridlines  = [];
    this.label_100k = [];
    this.label_1k   = [];
    this.label_100m = [];
    this.gridprecision = gridprecision; //Added MMD 8.4.2013. Gets passed to the prototypes as this.gridprecision
    this.zoomlevel = map.getZoom(); //Added MMD 10.30.2013. Better way to pass the zoom level to the drawOneCell function
}

// instance of one utm cell
Gridcell.prototype.drawOneCell = function() {
    try {
		
        //var utmcoords = [];
        //get the zone from the center lat/long, which is (this.slat+this.nlat)/2,(this.wlng+this.elng)/2
        var ctrUSNGparsed = usngfunc.fromLonLat({lon:(this.wlng+this.elng)/2,lat:(this.slat+this.nlat)/2},this.gridprecision);
        var ctrUSNGCoords = usngfunc.toUTM(ctrUSNGparsed);
        var zone = ctrUSNGCoords.zone;
        //console.log("Drawing One Cell with the Gridcell prototype. gridprecision is: "+this.gridprecision+", zone is: "+zone);
        
        var i,j,k,m,n,p,q;

        //USNG.LLtoUTM(this.slat,this.wlng,utmcoords,zone); //original. Xavier did this to:
        //He's trying to create a "utmcoords" array with 0:utm pt x, 1:utm pt y, and 2:zoneNumber

		//If instead we pass (lonlat, gridprecision) through Jim's fromLonLat and then toUTM functions, we'll get 
		//an array back of (utm_zone, grid_zone, utm_pt.utm_easting, utm_pt.utm_northing, precision)
		//what precision can we use? Right now we're using gridprecision, but does it matter?
        var swUSNGparsed = usngfunc.fromLonLat({lon:this.wlng,lat:this.slat},this.gridprecision); 
        var swUtmCoords = usngfunc.toUTM(swUSNGparsed); //returns { zone : utm_zone, easting : utm_easting, northing : utm_northing, precision : precision, usng: usng_string };
        //USNG.LLtoUTM(this.nlat,this.elng,utmcoords,zone); //original
		var neUSNGparsed = usngfunc.fromLonLat({lon:this.elng,lat:this.nlat},this.gridprecision);
		var neUtmCoords = usngfunc.toUTM(neUSNGparsed);
		//console.log("We took this lat/long bounding box SW: "+this.slat+","+this.wlng+", NE: "+this.nlat+","+this.elng+" to get: ")
		//Zone looks correct at this point. UTM coordinates are rounded depending on the precision, though.
		//console.log("SW UTM coordinates are: "+swUtmCoords.easting+", "+swUtmCoords.northing +"in zone: "+swUtmCoords.zone);
		//console.log("NE UTM coordinates are: "+neUtmCoords.easting+", "+neUtmCoords.northing +"in zone: "+neUtmCoords.zone);
        
        if (swUtmCoords.zone != neUtmCoords.zone ) {
        	console.log("Two zones apply - SW: "+swUtmCoords.zone+", NE: "+neUtmCoords.zone);
        }
        
        var sw_utm_e = (Math.floor(swUtmCoords.easting/this.interval)*this.interval)-this.interval;
        var sw_utm_n = (Math.floor(swUtmCoords.northing/this.interval)*this.interval)-this.interval;
        var ne_utm_e = (Math.floor(neUtmCoords.easting/this.interval+1)*this.interval) + 10 * this.interval;
        var ne_utm_n = (Math.floor(neUtmCoords.northing/this.interval+1)*this.interval) + 10 * this.interval;

        //console.log("Cell bounding coords: "+sw_utm_e+","+sw_utm_n+" - "+ne_utm_e+","+ne_utm_n);
        if( sw_utm_n > ne_utm_n || sw_utm_e > ne_utm_e) {
            throw("Error, northeast of cell less than southwest");
        }
        
        var geocoords    = null;
        var temp         = null;
        var gr100kCoord  = null;
        var northings    = [];
        var eastings     = [];

        // set density of points on grid lines as space in meters between points
        var precision;
        
        // case 1: zoomed out a long way; not very dense
        //originally if (this._map.getZoom() < 12 ) {
        //which always spit out as 1000 because this._map.getZoom wasn't returning an integer, but a function
		
        if (this.zoomlevel < 12 ) {
            precision = 10000;
        }
        // case 2: zoomed in a long way
        else if (this.zoomlevel > 15) {
           precision = 100;
        }
        // case 3: in between, zoom levels 12-15
        else {
           precision = 1000;
        }
		//console.log("At map zoom: "+this.zoomlevel+", so we use a precision of: "+precision);
		
        precision *= 10;  // experiment here with a speedup multiplier
        if( precision > this.interval * 5) {
            precision = this.interval * 5;
        }
        // ensure at least two vertices for each segment
        if( precision > ne_utm_n - sw_utm_n ) {
            precision = ne_utm_n - sw_utm_n;
        }
        if( precision > ne_utm_e - sw_utm_e ) {
            precision = ne_utm_e - sw_utm_e;
        }

        var skipFactor=1;

        if( this.interval==1000 && map.getZoom() == 11) {
            skipFactor=2;
        }

        // for each e-w line that covers the cell, with overedge
        northings[0] = this.slat;
        
        if( !northings[0]) {
            throw "Southern latitude is " + northings[0];
        }
        
        k=1;
        //calculate e-w lines which build "the ladder"
        for (i=sw_utm_n, j=0 ; i < ne_utm_n ; i += this.interval * skipFactor, j++) {

            // collect coords to be used to place markers
            // '2*this.interval' is a fudge factor that approximately offsets grid line convergence
            //geocoords = USNG.UTMtoLL_GeoPoint(sw_utm_e+(2*this.interval), i, zone); //original
            
            //using Jim's
            //We need a zone variable again: best to get it from the ctr lat long
            //Created by establishing the utm_proj var in map.js in order to access invProj
            //need to pass zone, easting, northing. Get back lat lon
            geocoords = utm_proj.invProj(zone, sw_utm_e+(2*this.interval), i);
            //console.log("My geocoords are: "+geocoords.lat + ", "+geocoords.lon );

			if ((geocoords.lat > this.slat) && (geocoords.lat < this.nlat)) {
                northings[k++] = geocoords.lat;
            }

            // calculate  line segments of one e-w line
            temp=[];
            for( m = sw_utm_e ; m <= ne_utm_e ; m += precision ) {
                //temp.push(USNG.UTMtoLL(m, i, zone));
                //Marconi's USNG.UTMtoLL produces a google.maps.LatLng
                var tmpCoords = utm_proj.invProj(zone, m, i);
                var tmpPoint = new google.maps.LatLng(tmpCoords.lat,tmpCoords.lon);
                temp.push(tmpPoint);
            }
			//console.log("My last tmpCoords on line 76x of gridlines.js are: "+tmpCoords.lat + ", "+tmpCoords.lon );
			
            gr100kCoord = [];

            // clipping routine...eliminate overedge lines
            // case of final point in the array is not covered
            for( p = 0  ; p < temp.length-1 ; p++ ) {
              if( this.checkClip(temp, p) ) {
                  gr100kCoord.push( temp[p] );
              }
            }

			//set path and styles of grid lines depending on interval
            if (this.interval == 100000) {
               this.gridlines.push(new google.maps.Polyline( {
                   path: gr100kCoord,
                   strokeColor: this.parent.gridStyle.semiMajorLineColor,
                   strokeWeight: this.parent.gridStyle.semiMajorLineWeight,
                   strokeOpacity: this.parent.gridStyle.semiMajorLineOpacity,
                   map: this._map}));

            }
            else if (this.interval == 1000) {
               this.gridlines.push(new google.maps.Polyline( {
                   path: gr100kCoord,
                   strokeColor: this.parent.gridStyle.minorLineColor,
                   strokeWeight: this.parent.gridStyle.minorLineWeight,
                   strokeOpacity: this.parent.gridStyle.minorLineOpacity,
                    map: this._map}));
            }
            else if (this.interval == 100) {
               this.gridlines.push(new google.maps.Polyline( {
                   path: gr100kCoord,
                   strokeColor: this.parent.gridStyle.fineLineColor,
                   strokeWeight: this.parent.gridStyle.fineLineWeight,
                   strokeOpacity: this.parent.gridStyle.fineLineOpacity,
                   map: this._map}));
            }
            
        }

        northings[k++] = this.nlat;
        eastings[0]    = this.wlng;
        k=1;

        // calculate n-s line that cover the cell, with overedge
        for (i=sw_utm_e; i<ne_utm_e; i+=this.interval * skipFactor,j++) {
          // collect coords to be used to place markers
          // '2*this.interval' is a fudge factor that approximately offsets grid line convergence
          //geocoords = USNG.UTMtoLL_GeoPoint(i, sw_utm_n+(2*this.interval), zone);
          geocoords = utm_proj.invProj(zone, i, sw_utm_n+(2*this.interval)); 
          //console.log("From UTM Easting: "+i+" and Northing: "+sw_utm_n);
          //console.log("My geocoords for n-s lines are: "+geocoords.lat + ", "+geocoords.lon );
          
          if (geocoords.lon > this.wlng && geocoords.lon < this.elng) {
          	//console.log("adding the geocoords long to eastings.");
              eastings[k++] = geocoords.lon;
          }

          temp=[];

          for (m=sw_utm_n,n=0; m<=ne_utm_n; m+=precision,n++) {
             //temp.push(USNG.UTMtoLL(i, m, zone));
             var tmpCoords = utm_proj.invProj(zone, i, m);
             var tmpPoint = new google.maps.LatLng(tmpCoords.lat,tmpCoords.lon);
             temp.push(tmpPoint);
          }
          
          // clipping routine...eliminate overedge lines
          gr100kCoord  = [];
          for (p=0 ; p < temp.length-1; p++) {
              if ( this.checkClip(temp,p)) {
                  gr100kCoord.push(temp[p]);
              }
          }
		  //push gr100kCoord path with styles depending on interval
          if (this.interval == 100000) {
             this.gridlines.push(new google.maps.Polyline({
                 path: gr100kCoord,
                 strokeColor: this.parent.gridStyle.semiMajorLineColor,
                 strokeWeight: this.parent.gridStyle.semiMajorLineWeight,
                 strokeOpacity: this.parent.gridStyle.semiMajorLineOpacity,
                 map: this._map}));
          }
          else if (this.interval == 1000) {
             this.gridlines.push(new google.maps.Polyline( {
                 path: gr100kCoord,
                 strokeColor: this.parent.gridStyle.minorLineColor,
                 strokeWeight: this.parent.gridStyle.minorLineWeight,
                 strokeOpacity: this.parent.gridStyle.minorLineOpacity,
                 map: this._map}));
          }
          else if (this.interval == 100) {
              
              this.gridlines.push(new google.maps.Polyline( {
                 path: gr100kCoord,
                 strokeColor: this.parent.gridStyle.fineLineColor,
                 strokeWeight: this.parent.gridStyle.fineLineWeight,
                 strokeOpacity: this.parent.gridStyle.fineLineOpacity,
                 map: this._map}));
          }
        }
		
        eastings[k] = this.elng;
        
        if (this.interval == 100000) {
           this.place100kLabels(eastings,northings);
        }
        else if (this.interval == 1000) {
           this.place1kLabels(eastings,northings);
        }
        else if (this.interval == 100) {
           
           this.place100mLabels(eastings,northings);
        }
     }
     catch(oneCellErr) {
       throw("Error drawing a cell: " + oneCellErr);
     }
}  // end drawOneCell


Gridcell.prototype.remove = function() {
    try {
        if( this.gridlines ) {
            for (var i=0; i < this.gridlines.length ; i++) {
                this.gridlines[i].setMap(null);
            }
            this.gridlines=[];
        }
        if( this.label_100k ) {
            for (i=0; this.label_100k[i]; i++) {
                this.label_100k[i].parentNode.removeChild(this.label_100k[i]);
            }
            this.label_100k = [];
        }

        if( this.label_1k ) {
            for (i=0; this.label_1k[i]; i++) {
                this.label_1k[i].parentNode.removeChild(this.label_1k[i]);
            }
            this.label_1k=[];
        }

        if( this.label_100m ) {
            for (i=0; this.label_100m[i]; i++) {
                this.label_100m[i].parentNode.removeChild(this.label_100m[i]);
            }
            this.label_100m = [];
        }
       
   }
   catch(ex) {
       alert("Error removing old USNG graticule: " + ex);
   }
}

Gridcell.prototype.makeLabel = function (parentGrid, latLong, labelText, horizontalAlignment, verticalAlignment, className) {
    var pixelPoint = this.parent.getProjection().fromLatLngToDivPixel(latLong);

    var d = document.createElement("div");
    var x = pixelPoint.x;
    var y = pixelPoint.y;

    var height = 15;
    var width  = 30;


    d.style.position = "absolute";
    d.style.width = "" + width + "px";
    d.style.height = "" + height + "px";

    if( className ) {
        d.className = className;
    }
    else {
        d.style.color = "#000000";
        d.style.fontFamily='Arial';
        d.style.fontSize='small';
    }

    d.innerHTML = labelText;

    d.style.textAlign = horizontalAlignment || "center";
    d.style.verticalAlign = verticalAlignment || "middle";
    
    d.style.left = ((horizontalAlignment || "center") == "center"  ? (x-0.5*width)  : x).toString() + "px";
    d.style.top  = ((verticalAlignment   || "middle") == "middle"  ? (y-0.5*height) : y).toString() + "px";

    parentGrid.getPanes().overlayLayer.appendChild(d);

    return d;
}

////////////////////////Draw 100K Labels, such as LQ or GH ///////////////////////////////
Gridcell.prototype.place100kLabels = function(east,north) {
    try {

        var zone;
        var labelText;
        var latitude;
        var longitude;


        if (map.getZoom() > 15) {
            return; // don't display label when zoomed way in
        }

        for (var i=0 ; east[i+1] ; i++ ) {
            
                
            for (var j=0; north[j+1]; j++) {
                // labeled marker
                //zone = MARCONI.map.getUTMZoneFromLatLong((north[j]+north[j+1])/2,(east[i]+east[i+1])/2 );
			    zone = usngfunc.fromLonLat({lon:(east[i]+east[i+1])/2,lat:(north[j]+north[j+1])/2},0);

                // lat and long of center of area
                latitude = (north[j]+north[j+1])/2;
                longitude = (east[i] + east[i+1])/2;
                
                labelText = usngfunc.fromLonLat({lon:longitude,lat:latitude}, 0);
                //console.log("Initial Label text for 100k: "+labelText);
                
                
                // if zoomed way out use a different label
				//Examples below, if zone>9, use 14T LQ
				//If not zone>9, use 4Q GH
                if (map.getZoom() < 11) {
                    if (zone > 9) {
                        labelText = labelText.substring(4,7)
                    }
                    else {
                        labelText = labelText.substring(3,6)
                    }
                }
                else { //if zoom is greater than 11, less than 15
                	// Don't know why Xavier broke it out this way, adding zone labels between z10 and z15
                	// Since they don't show otherwise if there is only one 100k label in view
                    if (zone > 9) {
                        labelText = /*labelText.substring(0,4) + */labelText.substring(4,7)
                    }
                    else {
                        labelText = /*labelText.substring(0,3) + */labelText.substring(3,6)
                    }
                    
                }
				
				//console.log("Manipulated Label text for 100k: "+labelText);
                this.label_100k.push(this.makeLabel(
                    this.parent, new google.maps.LatLng(latitude,longitude), labelText, "center", "middle",
                    this.parent.gridStyle.semiMajorLabelClass));
              
            }
        }
    }
   catch(markerError) {
       throw("Error placing 100k markers: " + markerError);
   }
}

Gridcell.prototype.place1kLabels = function(east,north) {
   try {
	   //console.log("Inside Gridcell Prototype Place1kLabels, East.length is: "+east.length);
	   //console.log("And North.length is: "+north.length);
       var latitude;
       var longitude;

       // at high zooms, don't label the 1k line since it'll get a 100m label'
       if (map.getZoom() > 15) {
           return;
       }

       // place labels on N-S grid lines (that is, ladder labels lined up in an E-W row)

       // place labels x-axis
       
       for (var i=1; east[i+1]; i++) { 
       	//originally (var i=1; east[i+1]; i++) 
       	//Then (var i=0; i<east.length; i++), which might be more than we need

       	           
         for (var j=1; j<2 && j+1 < north.length ; j++) {
         	//console.log("Inside the for east.length loop at position "+i+", east is"+east[i]+", north is: "+north[j]); 
          	//originally for (var j=1; j<2 && j+1 < north.length ; j++), which means will never start if north.length is 2 or less, and never get beyond 2
              if( !north[j] || !north[j+1]  ) {
                    console.log("at j=" + j + ", northing is " + north[j] + " and " + north[j+1]);
                }
                
               // labeled marker
               latitude  = (north[j]+north[j+1])/2;
               longitude = east[i];
               //console.log("x-axis lat/long is " + latitude + ", "+longitude+ " when j=" + j);
               if(!latitude) {
                    console.log("Warning: x-axis latitude is " + latitude + " when j=" + j);
                }
                if(!longitude) {
                    console.log("Warning: longitude is " + longitude);
                }
                
               //var gridRef = USNG.LLtoUSNG(latitude, longitude);
               var gridRef = usngfunc.fromLonLat({lon:longitude,lat:latitude}, 2);
               var parts = gridRef.split(" ");
               //console.log("Parts are: "+parts);

               var x = parseFloat(parts[2].substr(0,2));

               var z = parseFloat(parts[2].substr(2,3));
                if( z > 500 ) {
                    x++;
                    z=0;
                }

                var labelText = "" + x +"k";
                //console.log("X-axis marker label text is: "+labelText);
                var marker = this.makeLabel(this.parent, new google.maps.LatLng(latitude,longitude), labelText, "left", "top",
                    this.parent.gridStyle.minorLabelClass);
                this.label_1k.push(marker);
                
          }
       }

       // place labels on y-axis
       //console.log("Before line 1087, east.0 is: "+east[0]);
       for (i=1;i<2;i++) { //why such narrow definitions of i? Then it doesn't have enough to get through two east coordinates. 
       		//Originally i=1;i<2;i++
       		//Is this what makes too many y-axis labels?  (i=0; i<(east.length-1); i++)
          for (j=0; j<north.length; j++) { //originally for j=1; north[j+1]; j++
               // labeled marker
               latitude  = north[j];
               longitude = (east[i]+east[i+1])/2; //This is going to bomb when east[i+1] doesn't exist. Why do you have to split them?
               //console.log("Placing y axis labels, lat long is: "+latitude+", "+longitude); //longitude can be NaN at this point
               if(!latitude) {
                    console.log("Warning: y-axis latitude is " + latitude);
                }
                if(!longitude) {
                    console.log("Warning: y-axis longitude is " + longitude);
                }

               //gridRef  = USNG.LLtoUSNG(latitude,longitude);
			   gridRef = usngfunc.fromLonLat({lon:longitude,lat:latitude}, 2);
               parts = gridRef.split(" ");
               //console.log("Parts are: "+parts);

               var y = parseFloat(parts[3].substr(0,2));
               z = parseFloat(parts[3].substr(2,3));
                if( z > 500 ) {
                    y++;
                    z=0;
                }
              
               labelText = "" + y +"k";
               marker = this.makeLabel(this.parent, new google.maps.LatLng(latitude,longitude), labelText, "center", "top",
                    this.parent.gridStyle.minorLabelClass);
               this.label_1k.push(marker);
         }
       }
   }
   catch(ex) {
       throw("Error placing 1k markers: " + ex);
   }
}  // end place1kLabels()

Gridcell.prototype.place100mLabels = function(east,north) {
    try {

        // only label lines when zoomed way in
        if( map.getZoom() < 15) { //originally 14
            return;
        }

        if( east.length < 2 || north.length < 2 ) {
            return;
        }

        var skipFactor = (map.getZoom() > 15 ? 1 : 2);
        
        // place "x-axis" labels
        for (var i = 1; east[i+1] ; i+= 1) {
            for (var j=1; j< 2; j++) {
                
                //var gridRef  = USNG.LLtoUSNG((north[j]+north[j+1])/2, east[i]);
                var gridRefNorth = (north[j]+north[j+1])/2;
                var gridRef = usngfunc.fromLonLat({lon:east[i],lat:gridRefNorth}, 3);
                var parts = gridRef.split(" ");

                var x = parseFloat(parts[2].substr(0,3));
                var z = parseFloat(parts[2].substr(3,2));
                if( z > 50 ) {
                    x++;
                    z=0;
                }
                
                if( !(x % skipFactor) ) {
                    
                    var insigDigits = (skipFactor == 1 || !(x%10) ? "<sup>00</sup>" : "");
					/*function makeLabel expects: (parent, latLong, labelText, className) { */
                    this.label_100m.push(this.makeLabel(this.parent, new google.maps.LatLng((north[j]+north[j+1])/2,(east[i])),
                        //MARCONI.stdlib.fixedFormatNumber(x, 1, 0, true) + insigDigits, "left", "top",
                        x + insigDigits, "left","top",
                        this.parent.gridStyle.fineLabelClass));
                }
            }
        }

        // place "y-axis" labels, don't worry about skip factor since there's plenty of room comparatively
        for (i=1; i<2; i++) {
            for (j=1; north[j+1]; j++) {
                //gridRef  = USNG.LLtoUSNG(north[j],(east[i]+east[i+1])/2,4);
                var gridRefEast = (east[i]+east[i+1])/2;
                gridRef = usngfunc.fromLonLat({lon:gridRefEast,lat:north[j]}, 3);
                parts = gridRef.split(" ");
                //console.log("Parts are: "+parts[0]+", "+parts[1]+", "+parts[2]+", "+parts[3]);

                var y = parseFloat(parts[3].substr(0,3));
                z     = parseFloat(parts[3].substr(3,2));

                // if due to roundoff we got something like 99 for z, make it a perfect zero
                if( z > 50) {
                    y++;
                    z=0;
                }

               
                this.label_100m.push(this.makeLabel(
                    this.parent,
                    new google.maps.LatLng((north[j]),(east[i]+east[i+1])/2),
                    //MARCONI.stdlib.fixedFormatNumber(y,1,0,true) + "<sup>00</sup>", "center", "top",
                    y + "<sup>00</sup>", "center", "top",
                    this.parent.gridStyle.fineLabelClass));

            }
        }
   }
   catch(ex) {
       console.log("Error placing 100-meter markers: " + ex);
       throw("Error placing 100-meter markers: " + ex);
   }
}  // end place100mLabels()

Gridcell.prototype.checkClip = function(cp, p) {
    ///  implementation of Cohen-Sutherland clipping algorithm to clip grid lines at boundarie
    //        of utm zones and the viewport edges

    var that=this;  // so private funcs can see this via that

    function outcode(lat,lng) {
        var code = 0;
        if (lat < that.slat) {
            code |= 4;
        }
        if (lat > that.nlat) {
            code |= 8;
        }
        if (lng < that.wlng) {
            code |= 1;}
        if (lng > that.elng) {
            code |= 2;
        }
        return code;
    }
    function inside(lat,lng) {
        if (lat < that.slat || lat > that.nlat) {
            return 0;
        }
        if (lng < that.wlng || lng > that.elng) {
            return 0;
        }
        return 1;
    }

    var temp;
    var t;
    var u1=cp[p].lng();
    var v1=cp[p].lat();
    var u2=cp[p+1].lng();
    var v2=cp[p+1].lat();
    var code1 = outcode(v1, u1);
    var code2 = outcode(v2, u2);
    if ((code1 & code2) != 0) {   // line segment outside window...don't draw it
      return null;
    }
    if ((code1 | code2) == 0) {   // line segment completely inside window...draw it
      return 1;
    }
    if (inside(v1,u1)) {  // coordinates must be altered
      // swap coordinates
      temp = u1;
      u1 = u2;
      u2 = temp;

      temp = v1;
      v1 = v2;
      v2 = temp;

      temp = code1;
      code1 = code2;
      code2 = temp;
   }
   if (code1 & 8) { // clip along northern edge of polygon
      t = (this.nlat - v1)/(v2-v1)
      u1 += t*(u2-u1)
      v1 = this.nlat
      cp[p] = new google.maps.LatLng(v1,u1)
   }
   else if (code1 & 4) { // clip along southern edge
      t = (this.slat - v1)/(v2-v1);
      u1 += t*(u2-u1);
      v1 = this.slat;
      cp[p] = new google.maps.LatLng(v1,u1);
   }
   else if (code1 & 1) { // clip along west edge
      t = (this.wlng - u1)/(u2-u1);
      v1 += t*(v2-v1);
      u1 = this.wlng;
      cp[p] = new google.maps.LatLng(v1,u1);
   }
   else if (code1 & 2) { // clip along east edge
      t = (this.elng - u1)/(u2-u1);
      v1 += t*(v2-v1);
      u1 = this.elng;
      cp[p] = new google.maps.LatLng(v1,u1);
   }

   return 1;
}

///////////////////// end classes for "Gridcell" grid lines ///////////////////////



///////////////////////// class usng_georectangle//////////////////////////
function usng_georectangle() {
   this.nlat = 0;
   this.slat = 0;
   this.wlng=0;
   this.elng=0;
   this.centerlat=0;
   this.centerlng=0;
}

usng_georectangle.prototype.assignCorners = function(slat,nlat,wlng,elng) {
   //console.log("Inside assign corners, they will be: "+slat+", "+nlat+", "+wlng+", "+elng);
   this.nlat = nlat;
   this.slat = slat;

   // special case: Norway
   if (slat==56 && wlng==0) {
      this.wlng = wlng;
      this.elng = elng-3;
   }
   else if (slat==56 && wlng==6) {
      this.wlng = wlng-3;
      this.elng = elng;
   }
   // special case: Svlabard
   else if (slat==72 && wlng==0) {
      this.wlng = wlng;
      this.elng = elng+3;
   }
   else if (slat==72 && wlng==12) {
      this.wlng = wlng-3;
      this.elng = elng+3;
   }
   else if (slat==72 && wlng==36) {
      this.wlng = wlng-3;
      this.elng = elng;
   }
   else {
      this.wlng = wlng;
      this.elng = elng;
   }
}

usng_georectangle.prototype.assignCenter = function() {
      this.centerlat = (this.nlat+this.slat)/2;
      this.centerlng = (this.wlng+this.elng)/2;
}

usng_georectangle.prototype.getCenter = function() {
      return(new google.maps.LatLng(this.centerlat,this.centerlng));
}

usng_georectangle.prototype.getNW = function() {
      return(new google.maps.LatLng(this.nlat,this.wlng));
}
usng_georectangle.prototype.getSW = function() {
      return(new google.maps.LatLng(this.slat,this.wlng));
}
usng_georectangle.prototype.getSE = function() {
      return(new google.maps.LatLng(this.slat,this.elng));
}
usng_georectangle.prototype.getNE = function() {
      return(new google.maps.LatLng(this.nlat,this.elng));
}
//////////////////////////////////////////////////////////////////////////////