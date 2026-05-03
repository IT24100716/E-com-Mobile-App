const isVariantMatch = (vAttributes, itemAttributes) => {
    if (!vAttributes || Object.keys(vAttributes).length === 0) {
        return true;
    }

    if (!itemAttributes || Object.keys(itemAttributes).length === 0) {
        return true; 
    }

    // Helper to evaluate key equivalencies
    const getNormalizedKey = (key) => {
        const k = key.trim().toLowerCase();
        if (k === 'color') return 'colour';
        return k;
    };

    const ignoredKeys = ["id", "stock", "priceAdj", "_id"];

    // 1. Iterate over itemAttributes to make sure any selection the user provided matches the DB
    for (const [iKey, iValue] of Object.entries(itemAttributes)) {
        const normalizedIKey = getNormalizedKey(iKey);
        
        // Skip ignored metadata keys
        if (ignoredKeys.includes(normalizedIKey)) continue;
        
        const vKey = Object.keys(vAttributes).find(k => getNormalizedKey(k) === normalizedIKey);
        
        if (vKey) {
            // The DB has this attribute. If user sent null or empty, it means they skipped a required variant choice!
            if (iValue === null || iValue === undefined || iValue === "" || String(iValue).toLowerCase().startsWith("select ")) {
                 return false;
            }
            
            const vValue = vAttributes[vKey];
            
            let selValues = Array.isArray(iValue) ? iValue : [iValue];
            let reqValues = Array.isArray(vValue) ? vValue : [vValue];
            
            selValues = selValues.map(v => String(v).trim().toLowerCase());
            reqValues = reqValues.map(v => String(v).trim().toLowerCase());

            const matchesOption = selValues.some(selV => reqValues.includes(selV));
            if (!matchesOption) return false;
        } else {
             // User provided an attribute (e.g. colour) that the DB variant doesn't have.
             // If they actually selected a value, it's a mismatch.
             const isPlaceholder = iValue && String(iValue).toLowerCase().startsWith("select ");
             if (iValue !== null && iValue !== undefined && iValue !== "" && !isPlaceholder) {
                 return false;
             }
        }
    }
    
    // 2. Ensure user didn't omit a required frontend key that differentiates this variant
    // If the DB variant specifies a size/colour, and the user provided null or didn't provide it, it's a mismatch.
    const requiredFrontendKeys = ["size", "colour", "tone", "shade"];
    for (const [vKey, vValue] of Object.entries(vAttributes)) {
        const normalizedVKey = getNormalizedKey(vKey);
        const isFrontendKey = requiredFrontendKeys.some(k => normalizedVKey.includes(k));
        
        if (isFrontendKey) {
            const iKey = Object.keys(itemAttributes).find(k => getNormalizedKey(k) === normalizedVKey);
            if (!iKey || itemAttributes[iKey] === null || itemAttributes[iKey] === undefined || itemAttributes[iKey] === "") {
                return false; 
            }
        }
    }
    
    return true;
};

module.exports = { isVariantMatch };
