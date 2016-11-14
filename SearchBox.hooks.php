<?php
/**
 * Hooks for SearchBox extension
 *
 * @file
 * @ingroup Extensions
 */

class SearchBoxHooks {
	public static function onBeforePageDisplay( OutputPage &$out, Skin &$skin) {
        $out->addModules( array( "ext.SearchBox" ) );       
		return true;
	}
}
