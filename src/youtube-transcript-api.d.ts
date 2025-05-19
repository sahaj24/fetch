declare module 'youtube-transcript-api' {
  interface TranscriptItem {
    text: string;
    duration: number;
    offset?: number; // Milliseconds from start of video
    start?: number; // Seconds from start of video
    end?: number;   // Seconds from start of video
    dur?: number;   // Duration in seconds
  }

  // Main function to fetch transcript
  function getTranscript(videoId: string, options?: { lang?: string }): Promise<TranscriptItem[]>;
  
  // Sometimes returned as a method on the function
  namespace getTranscript {
    function fetchTranscript(videoId: string, options?: { lang?: string }): Promise<TranscriptItem[]>;
  }
  
  export default getTranscript;
}
