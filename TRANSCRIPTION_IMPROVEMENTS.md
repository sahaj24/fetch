# YouTube Subtitle Extraction Accuracy Improvements

## Issues Identified and Fixed

### 1. VTT Parsing Problems
**Issue**: The original VTT parser didn't handle complex auto-generated subtitle formats properly:
- Inline timing tags like `<00:00:19.039><c> word</c>` were not being removed
- VTT positioning attributes like `align:start position:0%` were included in text
- Duplicate content from overlapping subtitle segments

**Fix**: Improved `parseVttContent()` function in `utils.ts`:
- Added `cleanVttText()` function to remove VTT artifacts
- Better handling of positioning attributes
- Preference for clean text lines over tagged lines
- Post-processing deduplication to remove duplicate entries

### 2. HTML Entity Decoding
**Issue**: Limited HTML entity decoder that didn't handle complex cases:
- Double-encoded entities like `&amp;#39;` (should become `'`)
- Numbered entities like `&#39;` and `&#x27;`
- Common typographic entities

**Fix**: Enhanced `decodeHtmlEntities()` function in `route.ts`:
- Handles double-encoded entities first
- Supports numbered entities (decimal and hex)
- Added common typographic entities (smart quotes, dashes)

### 3. CLEAN_TEXT Format Processing
**Issue**: Poor text cleaning and formatting:
- Inadequate removal of VTT artifacts
- Poor handling of repetitions and filler words
- Limited punctuation and capitalization fixes

**Fix**: Completely rewrote CLEAN_TEXT processing:
- Better artifact removal ([Music], timing tags, etc.)
- Smart deduplication of repeated phrases
- Improved punctuation and capitalization
- Better contraction handling (wont → won't)
- Smarter paragraph breaks based on content and sentence count

## Files Modified

### `/src/app/api/youtube/extract/utils.ts`
- Enhanced `parseVttContent()` function (lines ~240-330)
- Added `cleanVttText()` helper function
- Added deduplication logic to remove duplicate subtitle entries

### `/src/app/api/youtube/extract/route.ts`
- Improved `decodeHtmlEntities()` function (lines ~225-245)
- Completely rewrote CLEAN_TEXT format processing (lines ~275-430)
- Better handling of auto-generated subtitle artifacts

## Testing Results

### Before Improvements:
- 95+ duplicate transcript entries from VTT parsing
- Raw text: `"We're<00:00:19.039><c> no</c><00:00:19.359><c> strangers</c>"`
- HTML entities: `"♪ We&amp;#39;re no strangers to love ♪"`
- Many repeated segments and poor formatting

### After Improvements:
- 37 clean, deduplicated transcript entries
- Raw text: `"We're no strangers to love"`
- HTML entities: `"♪ We're no strangers to love ♪"`
- Clean, readable text flow with proper punctuation

## Limitations

The improvements focus on **format accuracy** and **data cleaning**. They cannot fix:
- Underlying speech recognition errors from YouTube's auto-generated captions
- Missing or inaccurate transcriptions due to audio quality
- Language-specific transcription issues

## Impact

These minimal changes significantly improve transcription accuracy across **all subtitle formats** (SRT, VTT, TXT, CLEAN_TEXT, JSON, ASS, SMI) by:
1. **3x reduction** in duplicate content
2. **Proper handling** of VTT positioning and timing artifacts  
3. **Correct decoding** of HTML entities
4. **Better formatted** clean text output
5. **Preserved timing information** accuracy
