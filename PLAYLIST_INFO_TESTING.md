# Testing Guide: YouTube Playlist Information Feature

This guide explains how to test the improved YouTube playlist information feature.

## Backend API Endpoint Testing

To test the API directly:

```bash
# Test with a specific playlist ID
curl "http://localhost:3000/api/youtube/playlist-info?id=PLTmOFnEwhv3VhPQplJ4AozZ1fob7CIzf3" | jq

# Expected result:
# {
#   "title": "Startups Launch Skits",
#   "videoCount": 12,
#   "isEstimate": false
# }
```

## UI Testing

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to the main page and enter a YouTube playlist URL in the input field.
   - Example: `https://www.youtube.com/playlist?list=PLTmOFnEwhv3VhPQplJ4AozZ1fob7CIzf3`

3. You should see:
   - "Playlist detected" message with the playlist ID
   - Loading animation while fetching playlist data
   - The playlist title and exact video count (12 videos) with a "Verified" badge

## Different URL Format Testing

Try these URL formats to verify the enhanced URL detection:

1. Standard playlist URL:
   `https://www.youtube.com/playlist?list=PLTmOFnEwhv3VhPQplJ4AozZ1fob7CIzf3`

2. Video within playlist URL:
   `https://www.youtube.com/watch?v=VIDEOID&list=PLTmOFnEwhv3VhPQplJ4AozZ1fob7CIzf3`

3. Short URL format:
   `https://youtu.be/VIDEOID?list=PLTmOFnEwhv3VhPQplJ4AozZ1fob7CIzf3`

4. Direct playlist ID (for advanced users):
   `PLTmOFnEwhv3VhPQplJ4AozZ1fob7CIzf3`

## Error Testing

To test error handling:

1. Enter an invalid or non-existent playlist ID
2. The UI should show an estimated video count with "Estimate" badge
3. No error should be displayed to the user, as the system gracefully falls back to estimations

## Performance Testing

To verify caching is working:

1. Open browser developer tools (Network tab)
2. Enter a playlist URL and observe the API call
3. Enter the same URL again - you should see a faster response as it's served from cache
