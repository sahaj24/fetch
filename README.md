# FetchSub: YouTube Subtitle Extractor

FetchSub is a powerful web application designed to extract, process, and download subtitles from YouTube videos, playlists, and channels with support for multiple formats and languages.

## Table of Contents
1. [Overview](#overview)
2. [Features](#features)
3. [Architecture](#architecture)
4. [Core Components](#core-components)
5. [Subtitle Processing Flow](#subtitle-processing-flow)
6. [Advanced Features](#advanced-features)
7. [Technical Implementation](#technical-implementation)
8. [Getting Started](#getting-started)

## Overview

FetchSub allows users to extract subtitles from YouTube videos by simply providing a video URL, playlist URL, channel URL, or a CSV file containing multiple links. It supports various subtitle formats and languages, with features like translation and batch processing.

## Features

- **Multiple Input Options**:
  - Single YouTube video URLs
  - YouTube playlist URLs
  - YouTube channel URLs
  - CSV/TXT files with multiple URLs
  - Smart CSV parsing with delimiter detection

- **Format Support**:
  - Clean Text - Readable text with proper formatting
  - SRT - Industry standard subtitle format
  - VTT - Web Video Text Tracks format
  - TXT - Simple text with timestamps
  - Paragraph - Continuous flowing text
  - JSON - Structured data format
  - ASS - Advanced SubStation Alpha
  - SMI - SAMI format for synchronized text

- **Language Options**:
  - Auto-detection
  - Multiple language support
  - Translation capabilities when subtitles aren't available in the requested language

- **Advanced Processing**:
  - Batch processing for multiple videos
  - Real-time progress tracking with time estimation
  - Download individual subtitles or bulk download as ZIP
  - Copy to clipboard functionality
  - File preview for CSV uploads
  - Download history tracking

- **User Management**:
  - Coin-based economy system
  - User authentication
  - Payment integration
  - Usage tracking

## Architecture

FetchSub is built using Next.js with a client-server architecture:

### Frontend
- **React** with Next.js for the UI components
- **Tailwind CSS** for styling
- **Radix UI** components for enhanced user interface elements
- **Client-side state management** using React hooks

### Backend
- **Next.js API routes** for server-side processing
- **Firebase/Firestore** for user management and data storage
- **Node.js utilities** for subtitle extraction and processing

## Core Components

### Main Page (`src/app/page.tsx`)
The central controller that orchestrates the application flow:
- Manages application state
- Handles user interactions
- Coordinates between input, processing, and results display
- Manages coin-based transactions
- Provides real-time progress updates

### Input Section (`src/components/InputSection.tsx`)
Handles user input with intelligent processing:
- URL input with automatic detection of video/playlist/channel
- CSV file upload with automatic format detection
- File preview for CSV content
- Real-time CSV analysis with statistics
- Video count estimation for proper coin calculation

### Format Selection (`src/components/FormatSelection.tsx`)
Modern tabbed interface for selecting output options:
- Categorized format selection (Popular, Text, Advanced)
- Language selection grouped by regions
- Translation toggle option
- Coin cost estimation
- Format descriptions and tooltips

### Process Visualization (`src/components/ProcessVisualization.tsx`)
Visual representation of the extraction process:
- Progress bar with percentage
- Video count tracking
- Time remaining estimation
- Cancelation option

### Results Display (`src/components/ResultsDisplay.tsx`)
Displays extracted subtitles with various actions:
- Grouped by video
- Format and language badges
- Copy to clipboard functionality
- Individual download buttons
- Bulk ZIP download option
- Direct browser-side file generation

## Subtitle Processing Flow

1. **Input Collection**:
   - User provides YouTube URL(s) or uploads a CSV file
   - System analyzes the input to determine if it's a single video, playlist, or channel
   - For CSV files, the system parses and extracts valid YouTube URLs

2. **Coin Verification**:
   - System calculates the required coins based on video count and selected formats
   - Verifies if the user has sufficient coins
   - Requests confirmation for coin deduction for larger operations

3. **Extraction Process**:
   - API request is made to `/api/youtube/extract` with the input parameters
   - For single videos, the system directly extracts subtitles
   - For playlists/channels, the system first extracts video IDs then processes each video
   - Extraction is optimized with concurrency control to prevent overloading

4. **Subtitle Processing**:
   - The system fetches transcripts using YouTube Transcript API
   - If subtitles aren't available in the requested language, it falls back to auto-detection
   - Transcripts are formatted according to the selected output format
   - Translation is applied if requested

5. **Results Presentation**:
   - Processed subtitles are displayed grouped by video
   - Users can copy, preview, or download individual subtitles
   - Bulk download as ZIP option combines all subtitles

## Advanced Features

### Caching System
To optimize performance and reduce redundant processing:
- Implements in-memory caching for transcripts
- Cache expiration after 10 minutes
- Prevents re-fetching the same transcript multiple times

### Smart CSV Processing
Enhanced CSV handling with:
- Automatic delimiter detection (comma, tab, semicolon, pipe)
- Header row detection
- URL extraction from text fields
- Detailed statistics tracking
- File preview

### Direct Download Generation
Improved download functionality:
- Browser-side file generation instead of server requests
- Consistent content between preview and downloaded files
- ZIP archive creation directly in the browser using JSZip
- Proper file naming with format-specific extensions

### Coin Economy
Virtual currency system to manage usage:
- Each operation costs coins based on video count and format selection
- Translation requires additional coins
- Coin balance checking before processing
- Purchase options for more coins

## Technical Implementation

### YouTube Transcript Extraction (`src/app/api/youtube/extract/utils.ts`)
The core functionality that powers subtitle extraction:
- Uses youtube-transcript API as the primary method (faster)
- Falls back to yt-dlp when necessary
- Handles various YouTube URL formats
- Extracts video metadata
- Processes raw transcript data into formatted subtitles

### Concurrency Control
To handle batch processing efficiently:
- Limits the number of concurrent requests to 5
- Implements a queue system for processing multiple videos
- Provides progress updates during processing

### Error Handling
Robust error handling to ensure a smooth user experience:
- Fallback mechanisms when subtitles aren't available
- Graceful degradation with helpful error messages
- Placeholder subtitles instead of complete failures

### Format Conversion
Powerful conversion utilities to transform raw transcript data:
- SRT format with proper timing and sequence numbers
- VTT format with Web Video Text Track formatting
- Clean text with paragraph breaks and proper spacing
- JSON structured data for developers
- ASS format with styling information

## Getting Started

### Prerequisites
- Node.js 18.x or later
- YouTube API access
- Firebase account for authentication and storage

### Installation
1. Clone the repository
2. Install dependencies: `npm install`
3. Configure environment variables in `.env.local`
4. Run the development server: `npm run dev`

### Environment Variables
Create a `.env.local` file with the following variables:
- `YOUTUBE_API_KEY` - for accessing YouTube API
- `FIREBASE_API_KEY` - for Firebase authentication
- `FIREBASE_AUTH_DOMAIN` - Firebase configuration
- `FIREBASE_PROJECT_ID` - Firebase project identifier
- `FIREBASE_STORAGE_BUCKET` - Firebase storage
- `FIREBASE_MESSAGING_SENDER_ID` - Firebase messaging
- `FIREBASE_APP_ID` - Firebase application ID
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key (for payments)
- `STRIPE_SECRET_KEY` - Stripe secret key

---

FetchSub combines powerful backend processing with an intuitive user interface to provide a seamless experience for extracting and working with YouTube subtitles across multiple formats and languages.