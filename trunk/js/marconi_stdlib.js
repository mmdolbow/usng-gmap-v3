/* 
    file:       stdlib.js
    purpose:	general javascript functions
    namespace:  MARCONI.stdlib
    author:     Xavier Irias

Copyright (c) 2010, East Bay Municipal Utility District
All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

* Redistributions of source code must retain the above copyright notice,
this list of conditions and the following disclaimer.

* Redistributions in binary form must reproduce the above copyright notice,
this list of conditions and the following disclaimer in the documentation and/or
other materials provided with the distribution.

* Neither the name of the East Bay Municipal Utility District nor the names of its contributors
may be used to endorse or promote products derived from this software
without specific prior written permission.


THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS
OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR
CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY,
OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

*/

// create the namespace if needed
if( typeof(MARCONI) === "undefined") {
    MARCONI = {};
}

// define the util function that is used to create namespaces
MARCONI.namespace = function() {
    var a=arguments, o=null, i, j, d;
    for (i=0; i<a.length; i=i+1) {
        d=a[i].split(".");
        o=window;
        for (j=0; j<d.length; j=j+1) {
            o[d[j]]=o[d[j]] || {};
            o=o[d[j]];
        }
    }
    return o;
};

MARCONI.namespace('MARCONI.stdlib');

MARCONI.cookie = (function() {
    return { 
        load : function (cookieName) {
            try {
                
                if( typeof(cookieName) != "string") {
                    throw "Must supply cookieName to load cookie";
                }

                var the_cookie = document.cookie.split(';') || [];

                for( var i = 0 ; i < the_cookie.length ; i++) {

                    if( the_cookie[i].indexOf("=") > 0 && 
                        the_cookie[i].substr(0, the_cookie[i].indexOf("=")).trim() == cookieName ) {

                        var clearData = unescape(the_cookie[i].substr(the_cookie[i].indexOf("=")+1));

                        MARCONI.stdlib.log("Reading cookie " + cookieName + ", data=" + clearData);

                        return JSON.parse(clearData);

                    }
                    else {
                        MARCONI.stdlib.log("Skipping cookie data " + the_cookie[i]);
                    }
                }

                return null;
            }
            catch(ex) {
                MARCONI.stdlib.log("Error reading cookie: " + ex , "warn");
                return null;
            }
        },

        save: function (cookieName, data, expires, path) {
            try {
                if( typeof(cookieName) != "string") {
                    throw "Must supply cookieName as first argument";
                }
                var d = expires || new Date(2020, 02, 02);
                var p = path || '/';
                document.cookie = cookieName + "=" + escape(JSON.stringify(data))
                                  + ';path=' + p
                                  + ';expires=' + d.toUTCString();
                MARCONI.stdlib.log("Saved cookie data ");  // document.cookie);
            }
            catch(ex) {
                MARCONI.stdlib.log("Unable to save cookie, error: " + ex, "warn");
            }
        }
    };
}());


/* extender functions, extending some built-in objects 
*  These functions are of course not part of the MARCONI namespace
*/

if(!Array.indexOf) {
    // fix up Array so MSIE gets indexOf as well (Firefox has it already)
    Array.prototype.indexOf = function (obj, fromIndex) {
        if( typeof fromIndex == "undefined" ) {
            fromIndex=0;
        }

        for( var i =  fromIndex ; i < this.length ; i++ ) {
            if( this[i] == obj ) {
                return i;
            }
        }
        return -1;
    };
}

if(!Array.remove) {
    // remove a single element from an array, returning a new array
    Array.prototype.remove = function (index) {
        if( typeof( index )  == "undefined" ) {
            throw "Must provide index of item to remove";
        }

        if( index >= this.length ) {
            throw "Index must be less than length";
        }

        return this.slice(0,index).concat(this.slice(index+1));
    };
}

if( !String.trim ) {
    String.prototype.trim = function() {
        return this.replace(/^\s+|\s+$/g,"");
    };
}

if( !String.ltrim ) {
    String.prototype.ltrim = function() {
        return this.replace(/^\s+/,"");
    };
}

if( !String.rtrim ) {
    String.prototype.rtrim = function() {
        return this.replace(/\s+$/,"");
    };
}

if( !String.startsWith ) {
    String.prototype.startsWith = function(str) {
        return (this.match("^"+str)==str)
    }
}

if( !String.indexOfAny )  {
    String.prototype.indexOfAny = function(searchChars, startIndex) {
        if(!startIndex) {
            startIndex=0;
        }

        for( var i = startIndex ; i < this.length ; i++) {
            if( searchChars.indexOf(this.substr(i, 1)) >= 0 ) {
                return i;
            }
        }
        return -1;
    };
}

MARCONI.stdlib = function() {
    var lookupControl = function(ctlRefOrName) {

        if( typeof(ctlRefOrName) === "string") {
            var ref = document.getElementById(ctlRefOrName);
            if( !ref ) {
                //alert("ref " + ref + " not found with name " + ctlRefOrName);
                throw "Control " + ctlRefOrName + " not found";
            }
            return ref;
        }

        return ctlRefOrName;
    };

    return {
        addCodeFieldFilter : function(textControl, additionalChars) {
            function onChange() {

                // accept only letters, digits and selected punctuation, ignore all else
                var str=this.value;
                var dest="";
                var okChars="abcdefghijklmnopqrstuvwxyz0123456789_" + (typeof(additionalChars)==="string" ? additionalChars : "");

                // copy only allowed chars to the dest string
                for( var i = 0 ; i < str.length ; i++) {
                    if( okChars.indexOf(str.substr(i,1).toLowerCase()) >= 0 ) {
                        dest = dest + str.substr(i,1);
                    }
                }
                this.value=dest;
                return true;
            }

            try {
                if( window.YAHOO ) {
                    YAHOO.util.Event.addListener(textControl, "change", onChange);
                }
                else {
                    throw "Cannot add code field filter, need YAHOO library";
                }
            }
            catch(ex) {
                throw("addCodeFieldFilter() : error trying to install code field key filter: " + ex);
            }
            
        },
        adjacentCharWrapping : function(theStr, theChar, goLeft) {
            try {
                // given a string and a character in the string, return the char to the left or right

                var index = theStr.indexOf(theChar);
                if( goLeft ) {
                    return( index === 0 ? theStr.charAt(theStr.length-1) : theStr.charAt(index-1));
                }
                else {
                    return ( index === theStr.length-1 ? theStr.charAt(0) : theStr.charAt(index+1));
                }
            }
            catch(ex) {
                throw "Error handling adjacent character wrapping of string " + theStr + " and char " + theChar;
            }

        },
        adjustMobilityLinks : function(refMobile, refNonMobile) {
            var linkMobile = document.getElementById("linkMobile");
            if( linkMobile && linkMobile.href ) {
                linkMobile.href = refMobile;
            }
            else {
                var linkNonMobile = document.getElementById("linkNonMobile");
                if( linkNonMobile && linkNonMobile.href ) {
                    linkNonMobile.href = refNonMobile;
                }
            }
        },
        arrayFromStyleString : function(style) {
            // parse a CSS style string return an associative array
            
            if(!style) {
                return [];
            }
            var styleElems = style.split(";");

            var obj={};

            for( var i = 0 ; i < styleElems.length ; i++) {
                var parts = styleElems[i].split(":");
                var key   = parts[0].trim();
                var value = parts[1].trim();

                obj[key] = value;
            }

            return obj;
                
        },
        browserVersionNumber : function () {
            // return a floating point number
            // ONLY TESTED FOR MSIE

            var browser_version = navigator.appVersion;
            var idx = browser_version.indexOf("MSIE ");
            var ver=0;

            if( idx >= 0 )
            {
                var verStr = browser_version.substr(idx+5);
                //alert("version is " + verStr);
                idx = verStr.indexOf(";");
                if( idx >= 0 ) {
                    verStr = verStr.substring(0,idx);
                }
                ver = parseFloat(verStr);
            }

            return ver;
        },
        checkboxGetTriState : function( elem ) {
            // return true, false or null
            try {
                elem = lookupControl(elem);

                if( elem.indeterminate ) {
                    return null;
                }
                return elem.checked ? true : false;
            }
            catch(ex) {
                throw "Error getting tristate on checkbox: " + ex;
            }
        },
        checkboxSetTriState : function(elem, triState ) {
            function handleClick() {
                //MARCONI.stdlib.log("state was " + this.state);
                if( this.state === true) {
                    this.indeterminate=true;
                    this.checked=false;

                }
                else if( this.state === null) {
                    this.indeterminate = false;
                    this.checked = false;
                }
                else { // was false
                    this.indeterminate=false;
                    this.checked=true;
                }
                this.state = this.indeterminate ? null : this.checked;
                //MARCONI.stdlib.log("state is now " + this.state);
            }
            // given true, false or null/blank, set checkbox
            try {
                elem = lookupControl(elem);
                elem.indeterminate = (triState===null || triState==="");
                elem.checked = (triState===true || triState==="true");
                elem.state = elem.indeterminate ? null : elem.checked;
            }
            catch(ex) {
                throw "Error setting tristate on checkbox: " + ex;
            }
        },
        clone : function(obj) {
            return obj && window.YAHOO ? YAHOO.lang.JSON.parse( YAHOO.lang.JSON.stringify( obj ) ) : obj;
        },
        fireEvent : function (elem, eventName) {
            try {
                elem = lookupControl(elem);

                if(elem.fireEvent) { // IE Way
                    elem.fireEvent("on" + eventName);
                }
                else if(document.createEvent) { // Firefox Way
                    var evt = document.createEvent('HTMLEvents');
                    evt.initEvent(eventName, true, true);
                    elem.dispatchEvent(evt);
                }
            }
            catch(e) {
                throw("MARCONI.stdlib.fireEvent() reports error firing event " + eventName + " on element " + elem + ": " + e);
            }
        },
        fireMouseEvent : function (objRef, eventName) {
            if( document.createEvent ) {
                var evObj = document.createEvent('MouseEvents');
                evObj.initEvent( eventName, true, false );
                objRef.dispatchEvent(evObj);
            }
            else if( document.createEventObject ) {
                objRef.fireEvent("on" + eventName);
            }
        },
        fixedFormatNumber : function (num, minDigitsLeftOfDecimal, digitsRightOfDecimal, roundFirst) {
            try {
                if( num === undefined || num === null ) {
                    return "";
                }
                
                var floatValue = parseFloat(num);
                
                var isNegative = floatValue < 0;
                
                floatValue = Math.abs(floatValue);
                
                digitsRightOfDecimal = digitsRightOfDecimal || 0;
                
                // round off first
                var rounder = Math.pow(10, digitsRightOfDecimal);

                if( roundFirst ) {
                    
                    var newFloatValue = Math.round(floatValue * rounder) / rounder;
                    
                    floatValue = newFloatValue;
                }
                
                var parts = floatValue.toString().split(".");
                var intPortion = this.padLeft(parts[0],minDigitsLeftOfDecimal);
                var fract = parts.length > 1 ? parts[1] : "";
                
                // trim off decimal portion entirely if told to return an int
                if( digitsRightOfDecimal === 0 ) {
                    fract = "";
                }
                else {
                    fract = "." + fract;
                    
                    if( fract.length > digitsRightOfDecimal+1 ) {
                        fract = fract.substr(0, digitsRightOfDecimal+1);
                    }
                    else if( fract.length < digitsRightOfDecimal+1) {
                        fract = this.padRight(fract, digitsRightOfDecimal+1);
                    }
                }
                
                var str = (isNegative ? "-" : "") + intPortion + fract; 
                
                //MARCONI.stdlib.log(num + " formatted as " + str + ", based on " + minDigitsLeftOfDecimal + "." + digitsRightOfDecimal );
                
                return str;
            }
            catch(ex) {
                // non-fatal, just log it
                MARCONI.stdlib.log("Error formatting number " + num + ": " + ex);
                return num;
            }
        },
        friendlyErrorMessage : function(rawError, keyText) {
            if(!rawError) {
                return "";
            }
            
            keyText = keyText || "GRIM_ERROR:";

            if( rawError.indexOf(keyText) ) {
                return rawError.substring(rawError.lastIndexOf(keyText) + keyText.length);
            }
            return rawError;
        },
        getElemsWithClass : function (className, parentElement) {
            try {
                parentElement = lookupControl(parentElement);

                var root = (parentElement ? parentElement : document);

                var all = root.getElementsByTagName("*");  // any tag

                var myElements = [];


                for (var e = 0; e < all.length; e++) {
                  // test is a substring search, not simple equality since an element can have multiple space-separated classes

                  if ( !className || (" " + all[e].className + " ").indexOf(className) > 0 ) {

                      myElements.push(all[e]);

                  }
                }
                return myElements;
            }
            catch(ex) {
                throw "Error forming up elements of class " + className + ": " + ex;
            }
        },
        getFriendlyError: function(rawError) {

            if( rawError ) {
                var index = rawError.lastIndexOf("GRIM_ERROR:");
            
                if( index >= 0 ) {
                    return rawError.substr(index+11);
                }
                return rawError;
            }
            return null;
        },
        isDigit : function(theChar) {
            // actually accepts a string of ANY length, returns true only if all chars are digits

            if( typeof(theChar) != "string") {
                return false;
            }

            if( theChar.length === 0) {  // empty string can't be considered a digit
                return false;
            }

            for( var i = 0 ; i < theChar.length ; i++) {
                if( theChar.charAt(i) < '0' || theChar.charAt(i) > '9' ) {
                    return false;
                }
            }
            return true;
        },
        listboxAddItem : function (cb, itemString, itemValue, itemTitle) {
            try {
                cb=lookupControl(cb);

                if( !cb ) {
                   throw("select control not given");
                }

                if( typeof(itemValue) == 'undefined' ) {
                  itemValue = itemString;
                }

                cb.options[cb.options.length] = new Option(itemString, itemValue);

                var newItem = cb.options[cb.options.length-1];
                
                if( itemTitle ) {
                    newItem.title = itemTitle;
                }

                return newItem;

          }
          catch(ex) {
              throw("listboxAddItem(): unable to add item " + itemValue + " to listbox, error is :"  + ex);
          }
        },
        listboxAddItemIfMissing : function (cb, itemString, itemValue, itemTitle) {
            try {
                cb=lookupControl(cb);

                if( !cb ) {
                   throw("select control not given");
                }

                for( var i = 0 ; i < cb.options.length ; i++) {
                    if( cb.options[i].value == itemValue ) {
                        return cb.options[i];
                    }
                }

                return MARCONI.stdlib.listboxAddItem(cb, itemString, itemValue, itemTitle);

          }
          catch(ex) {
              throw("listboxAddItemIfMissing(): error is :"  + ex);
          }
        },
        listboxAllItems : function( cb ) {
            try {
                cb=lookupControl(cb);

                if( !cb ) {
                   throw("select control not given");
                }
                if( !cb.options || cb.options.length == 0 ) {
                    return null;
                }
                var items=[];
                for( var i = 0 ; i < cb.options.length ; i++) {
                    items.push(cb.options[i].value);
                }
                return items;
            }
            catch(ex) {
              throw("listboxAllItems(): unable to get items from listbox, error is :"  + ex);
            }
        },
        listboxClear : function (cb) {
            try {
                cb=lookupControl(cb);

                cb.options.length=0;

                cb.selectedIndex = -1;

                if( cb.options.length != 0) {
                    throw "Failed to clear listbox";
                }
            }
            catch(ex) {
                throw "Error clearing listbox: " + ex;
            }
        },
        listboxClearSelection : function ( cb ) {
            try {
                cb=lookupControl(cb);

                if( !cb ) {
                    throw("list control not provided");
                }
                if( cb.options.length > 0 ) {
                    cb.selectedIndex = -1;
                }
            }
            catch(ex) {
                throw "listboxClearSelection() error: " + ex;
            }
        },
        listboxIndexOf : function (cb, val) {
            try {
                cb=lookupControl(cb);

                if( !cb ) {
                    throw("list control not provided");
                }
                
                if( !cb.options ) {
                    return -1;
                }

                for( var i = 0 ; i < cb.options.length ; i++ ) {
                    if( cb.options[i].value == val) {
                        return i;
                    }
                }
                return -1;
            }
            catch(ex) {
                throw("listboxIndexOf() error: " + ex);
            }
        },
        listboxMoveItemBetweenLists : function ( lbFrom, lbTo ) {
            try {
                lbFrom = lookupControl(lbFrom);
                lbTo   = lookupControl(lbTo);
                var itemsMoved=0;

                if( !lbFrom || !lbTo ) {
                    throw "Must provide reference to both listboxes to move an item between the lists";
                }

                for( ; ; ) {
                    var indexFrom = lbFrom.selectedIndex;
                    if( indexFrom < 0 ) {
                        break;
                    }

                    var theLabel = lbFrom.options[indexFrom].text;
                    var theValue = lbFrom.options[indexFrom].value;

                    MARCONI.stdlib.listboxAddItem(lbTo, theLabel, theValue);
                    lbFrom.remove(indexFrom);
                    itemsMoved++;
                }
                if( itemsMoved > 0 ) {
                    MARCONI.stdlib.listboxSort(lbFrom);
                    MARCONI.stdlib.listboxSort(lbTo);
                }
                return itemsMoved;
            }
            catch(ex) {
                throw "Error trying to move item between listboxes: " + ex;
            }
        },
        listboxSelectedIndex : function (cb) {
            try {
                cb=lookupControl(cb);

                if( !cb ) {
                    throw("list control not provided");
                }

                return cb.selectedIndex;
                }
            catch(ex) {
                throw("listboxSelectedIndex() error: " + ex);
            }
        },
        listboxSelectedItem : function (cb) {
            try {
                cb=lookupControl(cb);

                if( !cb ) {
                    throw("list control not provided");
                }

                if( cb.selectedIndex  < 0  )  {
                    return null;
                }

                return cb.options[cb.selectedIndex];
            }
            catch(ex) {
                throw("listboxSelectedItem() error: " + ex);
            }
        },
        listboxSelectedText : function (cb) {
            try {
                cb=lookupControl(cb);

                if( !cb ) {
                    throw("list control not provided");
                }

                if( cb.selectedIndex  < 0  )  {
                    return "";
                }

                return cb.options[cb.selectedIndex].text;
            }
            catch(ex) {
                throw("listboxSelectedText() error: " + ex);
            }
        },
        listboxSelectedValue : function (cb) {
            try {
                cb=lookupControl(cb);

                if( !cb ) {
                    throw("list control not provided");
                }

                if( cb.selectedIndex  < 0  )  {
                    return "";
                }

                return cb.options[cb.selectedIndex].value;
            }
            catch(ex) {
                throw("listboxSelectedValue() error: " + ex);
            }
        },
        listboxSelectedValueOrText : function(cb) {
            try {
                cb=lookupControl(cb);


                if( !cb ) {
                    throw("list control not provided");
                }

                if( cb.selectedIndex  < 0  ) {
                    return "";
                }

                var val = cb.options[cb.selectedIndex].value;

                if( val === "" ) {
                    val = cb.options[cb.selectedIndex].text;
                }
                return val;
            }
            catch(ex) {
                throw "listboxSelectedValueOrText() error: " + ex;
            }
        },
        listboxSelectedValues : function (cb) {
            try {
                cb=lookupControl(cb);

                if( !cb ) {
                    throw("list control not provided");
                }

                var values = [];
                var selectionCount = 0;

                for( var i = 0 ; i < cb.length ; i++) {
                    if( cb.options[i].selected ) {
                            values.push(cb.options[i].value);
                            selectionCount++;
                    }
                }
                if( selectionCount === 0 ) {
                    return null;
                }

                return values;
            }
            catch(ex) {
                throw("listboxSelectedValues() error: " + ex);
            }
        },
        listboxSort : function(lb) {
            try {
                
                lb=lookupControl(lb);

                if( !lb ) {
                    throw("list control not provided");
                }

                Array.prototype.sort.call( lb.options,
                    function(a,b) {
                        return a.text < b.text ? -1 : a.text > b.text ? 1 : 0;
                    }
                );
            }
            catch(ex) {
                throw "listboxSort() error: " + ex;
            }

        },
        listboxSwapItems : function ( lb, idx1, idx2 ) {
            try {

                lb=lookupControl(lb);

                if( !lb ) {
                    throw("list control not provided");
                }
            

                if( idx1 < 0 || idx2 < 0 || lb.options.length-1 < idx1 || lb.options.length-1 < idx2 ) {
                    throw("Indices " + idx1 + " and " + idx2 + " not in bounds");
                }

                var theLabel = lb.options[idx1].text;
                var theValue = lb.options[idx1].value;

                lb.options[idx1].value=lb.options[idx2].value;
                lb.options[idx1].text=lb.options[idx2].text;

                lb.options[idx2].value=theValue;
                lb.options[idx2].text=theLabel;
            }
            catch(ex) {
                throw "listboxSwapItems() error: " + ex;
            }
        },
        listboxSynchToValue : function ( cb, value ) {
            try {
                cb=lookupControl(cb);

                if( !cb ) { 
                    throw("list control not provided");
                }

            
                for( var i = 0 ; i < cb.options.length ; i++) {
                    if( cb.options[i].value == value) {
                        cb.selectedIndex = i;
                        
                        //MARCONI.stdlib.log("Set listbox to " + value);
                        break;
                    }
                }
            }
            catch(ex) {
                throw "listboxSynchToValue() error: " + ex;
            }
        },
        listboxSynchToValues : function ( cb, valueList ) {
            try {
                cb=lookupControl(cb);

                if( !cb ) { 
                    throw("list control not provided");
                }
                if( !valueList || !valueList.length) { 
                    throw("valuelist array not provided to listboxSynchToValues");
                }

            
                for( var i = 0 ; i < cb.options.length ; i++) {
                    cb.options[i].selected = valueList.indexOf(cb.options[i].value) >= 0 ; 
                }
            }
            catch(ex) {
                throw "listboxSynchToValue() error: " + ex;
            }
        },
        listboxSynchToValueOrText : function( cb, value, caseInsensitive ) {
            try {
                cb=lookupControl(cb);
            
                if( !cb ) {
                    throw("list control not provided");
                }
                for( var i = 0 ; i < cb.options.length ; i++)  {
                   if( cb.options[i].value == value || cb.options[i].text == value ||
                       (caseInsensitive && (cb.options[i].value.toUpperCase() == value.toUpperCase() || cb.options[i].text.toUpperCase() == value.toUpperCase()))) {

                        cb.selectedIndex = i;
                        break;
                   }
                }
            }
            catch(ex) {
                 throw "listboxSynchToValueOrText() error: " + ex;
            }
        },
        logObject : function(obj,name, indent, depth, maxDepth) {
            if(!maxDepth ) {
                maxDepth = 5;
            }

            if( typeof(name)   == "undefined") {
                name = "top-level";
            }
            if( typeof(indent) == "undefined") {
                indent="";
            }
            if( typeof(depth)  == "undefined") {
                depth = 1;
            }

            try {
                  if (depth > maxDepth) {
                     return indent + name + ": <Maximum Depth Reached>\n";
                  }

                  if (typeof obj == "object") {

                         var child = null;

                         var output = indent + name + "\n";

                         indent += "\t";

                         for (var item in obj)
                         {
                               if( obj.hasOwnProperty && obj.hasOwnProperty(item) ) {

                                   try {

                                          child = obj[item];

                                   } catch (e) {

                                          child = "<Unable to Evaluate>";

                                   }

                                   if (child && typeof(child) == "object"  ) {
                                          output += this.logObject(child, item, indent, depth + 1, maxDepth);

                                   } else {

                                          output += indent + item + ": " + child + "\n";

                                   }
                               }


                         }

                         return output;

                  } else {

                         return obj;

                  }


            }
            catch(err) {
                MARCONI.stdlib.log("Error dumping object " + obj);
                return "error dumping: " + err;
            }
        },
        padLeft : function (number,length) {
            var str = '' + number;
            while (str.length < length) {
                str = '0' + str;
            }
            return str;
        },
        padRight : function (number,length) {
            var str = '' + number;
            while (str.length < length) {
                str += '0';
            }
            return str;
        },
        paramString : function(givenURL) {
            try {
                if( typeof(givenURL) =="undefined" || givenURL === null ) {
                    var queryString = window.location.search;
                    return ( queryString.length > 1 ? queryString.substr(1) : "");
                }
                else {
                    var paramIndex= givenURL.indexOf("?");
                    if( paramIndex >= 0 ) {
                        return givenURL.substr(paramIndex+1);
                    }
                }
                return "";
            }
            catch(ex) {
                throw("paramString() error parsing querystring from URL " + givenURL + ", error is : " + ex);
            }
        },
        paramValue : function( paramName, defaultVal, paramString ) {
            try {

                paramString = (paramString ? paramString : MARCONI.stdlib.paramString());
                var val=null;
                var params = paramString.split("&");
                for( var i = 0 ; i < params.length ; i++) {

                    var param = params[i].split("=");

                    if( param.length == 2 && param[0].toUpperCase() == paramName.toUpperCase()) {
                        val = param[1];
                    }
                }
                return (val !== null  ? unescape(val) : (typeof(defaultVal) == "undefined" ? null : defaultVal));
            }
            catch(ex) {
                throw "paramValue() error with paramName " + paramName + ", error is " + ex;
            }
        },
        pluralModifier : function( theVal ) {
            try {
                if( theVal > 1 || theVal === 0) {
                    return "s";
                }
                return "";
            }
            catch(ex) {
                throw "pluralModifier() error: " + ex;
            }
        },
        radioButtonSelectedIndex : function( buttonGroup ) {
            try {
                var radioItems = document.getElementsByName(buttonGroup);

                if( !radioItems ) {
                    throw("radiobutton named " + buttonGroup + " not found.");
                }

                for (var i=0; i < radioItems.length; i++) {
                    if( radioItems[i].checked) {
                        return i;
                    }
                }

                return -1;
            }
            catch(ex) {
                throw "radioButtonSelectedIndex() error: " + ex;
            }
        },
        radioButtonSetState : function( buttonGroup, value ) {
            try {
                var radioItems = document.getElementsByName(buttonGroup);
                if( !radioItems ) {
                    throw("radiobutton named " + buttonGroup + " not found.");
                }

                for( var i = 0 ; i < radioItems.length ; i++) 	{

                    if( radioItems[i].value == value )  {

                        radioItems[i].checked = true;

                        return true;
                    }
                }

                return false;
            }
            catch(ex) {
                throw "radioButtonSetState() error: " + ex;

            }
        },
        radioButtonValue : function( buttonGroup ) {
            try {
                var radioItems = document.getElementsByName(buttonGroup);

                if( !radioItems ) {
                    throw("radiobutton named " + buttonGroup + " not found.");
                }

                for (var i = 0 ; i < radioItems.length ; i++) {
                    if( radioItems[i].checked) {

                        return radioItems[i].value;
                    }
                }

                return null;
            }
            catch(ex) {
                throw "radioButtonValue() error: " + ex;
            }
        },
        repeat : function(str, count) {
            try {
                var temp = [];
                for( var i = 0 ; i < count ; i++) {
                    temp.push(str);
                }
                return temp.join("");
            }
            catch(ex) {
                throw("repeat() error repeating string " + str + " " + count + " times: " + ex);
            }
        },
        log : function (msg, msgType) {
            try {

                msgType = msgType || "info";

                // if console is open, use it 
                if( typeof(window.console) !== "undefined" && console.info ) {
                    switch(msgType) {
                        case "info":
                            console.info(msg);
                            break;

                        case "warn":
                            if(console.warn) {
                                console.warn(msg);
                            }
                            else {
                                console.info(msg);
                            }
                            break;

                        case "error":
                            if(console.error) {
                                console.error(msg);
                            }
                            else {
                                console.info(msg);
                            }
                            break;

                        case "debug":
                            if(console.debug) {
                                console.debug(msg);
                            }
                            else {
                                console.info(msg);
                            }
                            break;

                        default:
                            console.info(msg);


                    }
                }
                
            }
            catch(ex) {
                // an error in a logging func can be a nightmare since one logs to find other errors
                // so throw the error in the interest of quick diagnosis
                throw "Error in logging function: " + ex;
            }
            
        },
        setReadonlyByClass : function (className, readOnly, parentElement) {
            // get all elements of indicated class that belong to the indicated parent element
            var elems = MARCONI.stdlib.getElemsWithClass(className, parentElement);

            // then set each element readonly or not as appropriate
            for( var i=0 ; i < elems.length ; i++) {

                if( readOnly ) {
                    elems[i].setAttribute("readonly","readonly");
                }
                else {
                    elems[i].removeAttribute("readonly");
                }
            }
        },
        setScreenResolution : function () {
            try {
                
                if( document.getElementById("ScreenWidth") && document.getElementById("ScreenHeight")) {

                    document.getElementById("ScreenWidth").value  =  window && window.screen && window.screen.width  ? window.screen.width : "";
                    document.getElementById("ScreenHeight").value =  window && window.screen && window.screen.height ? window.screen.height : "";
                }
            }
            catch(ex) {
                MARCONI.stdlib.log("setScreenResolution() error: " + ex);
            }
        },
        
        strcmp : function(a,b) {
            try {
                return( a==b ? 0 : (a < b ? -1 : 1));
            }
            catch(ex) {
                throw "strcmp() error comparing strings " + a + " and " + b + ": " + ex;
            }
        },
        synchListBoxFromInputControl : function (cb, txt) {
            try {
                txt=lookupControl(txt);

                if( !txt ) {
                    throw("text control not provided");
                }

                var val = txt.value;

                MARCONI.stdlib.listboxSynchToValue(cb, val);
            }
            catch(ex) {
                throw "synchListBoxFromInputControl() error: unable to synch listbox from text control: " + ex;
            }
        },
        unescapeHTML : function(str) {
            // Unescape html special characters
            return str ? str.replace("&amp;", "&").replace("&quot;", "\"").replace("&lt;", "<").replace("&gt;", ">")
                : null;
        },
        typeOf : function(obj) {
            if ( typeof(obj) === "object" ) {
                return ( typeof(obj.length)==="number" ? "array" : "object");
            } 
            else {
                return typeof(obj);
            }
        },
        updateCSSClass : function (className, cssText) {
            try {
                
                var theRules = [];

                for( var styleSheetIndex=0 ; styleSheetIndex < document.styleSheets.length; styleSheetIndex++) {
                  var theSheet=document.styleSheets[styleSheetIndex];

                  if (theSheet.cssRules) {
                      theRules = theSheet.cssRules;
                  }
                  else if (theSheet.rules) {
                    theRules = theSheet.rules;
                  }

                  // alert("theRules length is " + theRules.length);

                  for(var i = 0 ; i < theRules.length ; i++) {

                      if(theRules[i].selectorText.toLowerCase() == className.toLowerCase()) {

                        // this call is not needed, and MSIE does not like it
                        // var oldVal=theRules[i].style.getPropertyValue(property);

                        if( theSheet.cssRules)   { // Mozilla
                            theSheet.deleteRule(i);
                            theSheet.insertRule("" + className + "{" + cssText + "}", theSheet.cssRules.length);
                        }
                        else  { // MSIE
                            theSheet.removeRule(i);
                            theSheet.addRule(className, cssText, 0);
                        }
                        break;
                    }
                  }
                }
              }
              catch(ex) {
                  throw "updateCSSClass() error: " + ex;
              }
        }
    };  // end of return value, object literal
}();
        


