/**
 * ext.SearchBox
 *
 * @author Hagai Asaban
 * @license MIT
 */

( function ( mw, $ ) {

    var api = new mw.Api();
    var allCategories = new Array();
    
    function loadApiCategoriesData() {

        api.get( {
            formatversion: 2,
            action: 'query',
            prop: 'categories',
            aclimit: 5000,
            list: 'allcategories'
        } ).done( function (res) {            
            var categories = res.query.allcategories;
            categories.map(function (item) {
                allCategories.push(item.category);
            } );
            loadSearchBox();
            
        } ).fail( function (code, result) {
            if (code === "http") {
                mw.log("HTTP error: " + result.textStatus); // result.xhr contains the jqXHR object
            } else if (code === "ok-but-empty") {
                mw.log("Got an empty response from the server");
            } else {
                mw.log("API error: " + code);
            }
        } );
    };
    
    // Compute form data for search suggestions functionality.
    function computeResultRenderCache( context ) {
        var $form, baseHref, linkParams;

        // Compute common parameters for links' hrefs
        $form = context.config.$region.closest( 'form' );

        baseHref = $form.attr( 'action' );
        baseHref += baseHref.indexOf( '?' ) > -1 ? '&' : '?';

        linkParams = {};
        $.each( $form.serializeArray(), function ( idx, obj ) {
            linkParams[ obj.name ] = obj.value;
        } );

        return {
            textParam: context.data.$textbox.attr( 'name' ),
            linkParams: linkParams,
            baseHref: baseHref
        };
    }

    // The function used to render the suggestions.
    function customRenderFunction( text, context ) {
        var page, namespace,
            title = mw.Title.newFromText( text ),
            info = computeResultRenderCache( context );
            
        info.linkParams[ info.textParam ] = text;

        page = title.getMainText();
        
        //console.log(page);
        
        namespace = $( '<span>' ).text( mw.config.get( 'wgFormattedNamespaces' )[ title.namespace ] ).addClass( 'mw-mnss-srcc' );
        var links =  $( '<a>' ).attr( 'href', info.baseHref + $.param( info.linkParams ) ).addClass( 'mw-searchSuggest-link' );
        
        // 'this' is the container <div>, jQueryfied
        modalContent.append( page, namespace ).wrap( links );
    }
    

    function CreateResultsModal( searchQuery, results, selectedNamespaces, selectedCategories, allFormattedNamespaces ) { 
        
        var mainNamespaceText = mw.msg("main-namespace");
        var noResults = mw.msg("no-results");
        var resultsTitle = mw.msg("results-title");
        var resultsInNamespaces = mw.msg("results-in-namespaces");
        var resultsInCategories = mw.msg("results-in-categories");
        var formattedSelectedCategories = selectedCategories.join( ' | ' );
        var formattedSelectedNamespaces = [];
        
        allFormattedNamespaces[0] = mainNamespaceText;
        
        selectedNamespaces.map(function (item) {
            formattedSelectedNamespaces.push( allFormattedNamespaces[ item ] );
        } );
        
        var formattedSelectedNamespacesStr = formattedSelectedNamespaces.join( ' | ' );
        
        console.log(formattedSelectedNamespacesStr);
        
        var resultsData = {
            resultsTitle: resultsTitle,
            searchQuery: searchQuery,
            HasNamespaces: (selectedNamespaces.length > 0),
            HasCategories: (selectedCategories.length > 0),
            resultsInNamespaces: resultsInNamespaces,
            selectedNamespaces: formattedSelectedNamespacesStr,
            resultsInCategories: resultsInCategories,
            selectedCategories: formattedSelectedCategories,
            results: results,
            hasResults: (results.length > 0),
            noResults: noResults
        }; 
        
        var resultsTemplate = mw.template.get("ext.SearchBox", "results.mustache");
            var rendered = resultsTemplate.render(resultsData);
        /*
        var searchBoxContainer = $( "#searchBoxContainer" ).clone().find('#dropdown-menu').toggleClass('open');
        rendered.prepend(searchBoxContainer);
        */   
        var modalContent = rendered.html();
 
        //var modalClass = 'materialDialog';
        var modalClass = ''; 

        MaterialModal( modalContent, modalClass ); 
    };

    function Search( selectedNamespaces, selectedCategories, $searchInput, allFormattedNamespaces) {        
         
        var searchQuery = $searchInput.val();
        
        var formattedSelectedNamespaces = "";
        var formattedSelectedCategories = "";
        var searchQueryWithCategories = searchQuery;

        if( selectedNamespaces.length ) {                        
            formattedSelectedNamespaces = selectedNamespaces.join( '|' );
        }

        if( selectedCategories.length ) {                        
            formattedSelectedCategories = selectedCategories.join( '|' );
            searchQueryWithCategories = searchQuery + " incategory:" + formattedSelectedCategories;                       
        }

        if ( searchQueryWithCategories.length !== 0 ) {
            api.get( {                        
                action: 'query',
                list: 'search',
                srsearch: searchQueryWithCategories,
                srwhat: 'text',
                srnamespace: formattedSelectedNamespaces,
                srredirects: true,
                srlimit: 100,
                srprop: 'timestamp|snippet|titlesnippet|wordcount|categorysnippet'
            } ).done( function ( data ) {
                var results = Array.prototype.map.call(data.query.search, function(obj) {
                    var dateTime = moment(obj.timestamp);
                    obj.hasTitleSnippet = (obj.titlesnippet.length > 0);
                    obj.hasCategorySnippet = (obj.categorysnippet.length > 0);
                    obj.lastUpdate = dateTime.fromNow();
                    return obj;
                }); 

                CreateResultsModal(searchQuery,
                                   results,
                                   selectedNamespaces,
                                   selectedCategories,
                                   allFormattedNamespaces);

            } ).fail(function (code, result) {
                if (code === "http") {
                    mw.log("HTTP error: " + result.textStatus); // result.xhr contains the jqXHR object
                } else if (code === "ok-but-empty") {
                    mw.log("Got an empty response from the server");
                } else {
                    mw.log("API error: " + code);
                }
            } );
        }
    };
    
    function loadSearchBox() {
        
        var allFormattedNamespaces = mw.config.get( 'wgFormattedNamespaces' );
        var allNamespaces = new Array();
        var mainNamespaceText = mw.msg("main-namespace");
       
        $.each( allFormattedNamespaces, function( key, value ) {
            
            if (key != 0) {                
                allNamespaces.push( {
                    value: key,
                    text: value
                } );
            } else {
                allNamespaces.push( {
                    value: key,
                    text: mainNamespaceText
                } );
            }
        }); 
        
        var searchBoxData = {
            "namespaces": allNamespaces,
            "categories": allCategories,
            "filterBtnPopupTitle": "מסננים",
            "searchInputPopupTitle": "חיפוש",
            "searchInputPlaceholder":" חיפוש במרחב שם הראשי עם קטגוריה 'בדיקה' ..",
            "searchBtnPopupTitle": "לחץ כאן לחיפוש",            
            "isFilterVisible": false
        };

        var searchBoxTemplate = mw.template.get("ext.SearchBox", "search-box.mustache");
        var randered = searchBoxTemplate.render(searchBoxData);
        
        $( '#content' ).append(randered);
        var $searchInput = $( '#searchBoxInput' ); 

        var filterBtn = $('#filterBtn');

        // trigger dropdown
        filterBtn.on('click', function(e) {
            e.preventDefault();
            $('#dropdown-menu').toggleClass('open');           
        } );

        var namespaceSelector = $('#namespaceSelector').SumoSelect( {
            search: true, 
            searchText: ' חפש ... ',
            noMatch: 'לא נמצא "{0}"',
            placeholder: 'בחר מרחבי שם',
            okCancelInMulti: true,
            locale: ['בחר', 'בטל', 'בחר הכל'],
            captionFormat: '{0} נבחרו',
            captionFormatAllSelected: 'נבחרו כול מרחבי השם',
            selectAll: true
        } );
        
        var categoriesSelector = $('#categoriesSelector').SumoSelect( {
            placeholder: 'בחר קטגוריות',
            search: true, 
            searchText: ' חפש ... ',
            noMatch: 'לא נמצא "{0}"',
            okCancelInMulti: true,
            locale: ['בחר', 'בטל', 'בחר הכל'],
            captionFormat: '{0} נבחרו',
            selectAll: false
        } );
        
        var selectedNamespaces = [];
        var selectedCategories = [];
    
        $("#namespaceSelector").on( "change", function(e) {
            e.preventDefault();
            var selected = e.target.selectedOptions;
            selectedNamespaces = [];
            
            if (selected.length){                
                for (i = 0; i < selected.length; i++) { 
                    selectedNamespaces.push(selected[i].value);
                } 
            }
        } );
        
        $("#categoriesSelector").on( "change", function(e) {
            e.preventDefault();
            var selected = e.target.selectedOptions;
            selectedCategories = [];
            
            if ((selected.length) && (selected.length < 70)){                
                for (i = 0; i < selected.length; i++) { 
                    selectedCategories.push(selected[i].value);
                }
            }
        } );
        
        //selects the category item 'API'
        categoriesSelector.sumo.selectItem('בדיקה');
        
        //selects the item at index 0 - main
        namespaceSelector.sumo.selectItem(0);
        
        
        $(document).on("click", "#searchButton", function (e) {
            e.preventDefault();
            Search( selectedNamespaces, selectedCategories, $searchInput, allFormattedNamespaces);
        });   

    };
    
    $( function () {  
        loadApiCategoriesData();
    });

}( mediaWiki, jQuery ) );