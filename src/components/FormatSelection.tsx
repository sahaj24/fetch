"use client";

import React, { useState, useEffect } from "react";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Slider } from "./ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Switch } from "./ui/switch";
import { CoinCalculator } from "./CoinCalculator";
import { 
  Languages, 
  FileType, 
  Settings, 
  Info, 
  FileJson, 
  FileText, 
  BookText,
  ListStart,
  Sparkles,
  Clock,
  Lightbulb,
  MessageSquareText
} from "lucide-react";

interface FormatSelectionProps {
  onFormatChange?: (formats: string[]) => void;
  onLanguageChange?: (language: string) => void;
  selectedFormats?: string[];
  selectedLanguage?: string;
  videoCount?: number;
  isPlaylist?: boolean;
  children?: React.ReactNode;
}

const FormatSelection = ({
  onFormatChange = () => {},
  onLanguageChange = () => {},
  selectedFormats = ["CLEAN_TEXT", "SRT"],
  selectedLanguage = "en",
  videoCount = 1,
  isPlaylist = false,
  children,
}: FormatSelectionProps) => {
  const [formats, setFormats] = useState<string[]>(selectedFormats);
  const [language, setLanguage] = useState<string>(selectedLanguage);

  // Grouped format options by category for better organization
  const formatCategories = [
    {
      name: "popular",
      label: "Popular",
      icon: <Sparkles size={16} />,
      description: "Most commonly used formats",
      formats: [
        { id: "clean_text", label: "Clean Text", value: "CLEAN_TEXT", description: "Readable text with proper formatting", icon: <BookText size={14} />, popular: true },
        { id: "srt", label: "SRT", value: "SRT", description: "Industry standard subtitle format", icon: <FileText size={14} />, popular: true },
        { id: "vtt", label: "VTT", value: "VTT", description: "Web Video Text Tracks format", icon: <FileText size={14} /> },
      ]
    },
    {
      name: "text",
      label: "Text",
      icon: <MessageSquareText size={16} />,
      description: "Plain text formats without special formatting",
      formats: [
        { id: "txt", label: "TXT", value: "TXT", description: "Simple text with timestamps", icon: <FileText size={14} /> },
      ]
    },
    {
      name: "advanced",
      label: "Advanced",
      icon: <Lightbulb size={16} />,
      description: "Special formats for specific use cases",
      formats: [
        { id: "json", label: "JSON", value: "JSON", description: "Structured data for developers", icon: <FileJson size={14} /> },
        { id: "ass", label: "ASS", value: "ASS", description: "Advanced SubStation Alpha for styling", icon: <FileText size={14} /> },
        { id: "smi", label: "SMI", value: "SMI", description: "SAMI format for synchronized text", icon: <Clock size={14} /> },
      ]
    },
  ];

  // Define types for languages and regions
  type Language = {
    value: string;
    label: string;
    popular?: boolean;
  };

  type LanguageRegion = {
    name: string;
    label: string;
    languages: Language[];
  };

  // Language options grouped by region for better UX
  const languageRegions: LanguageRegion[] = [
    {
      name: "popular",
      label: "Popular",
      languages: [
        { value: "en", label: "English", popular: true },
      ]
    },
    {
      name: "european",
      label: "European",
      languages: [
        { value: "en", label: "English" },
        { value: "es", label: "Spanish" },
        { value: "fr", label: "French" },
        { value: "de", label: "German" },
        { value: "it", label: "Italian" },
        { value: "pt", label: "Portuguese" },
        { value: "ru", label: "Russian" },
      ]
    },
    {
      name: "asian",
      label: "Asian",
      languages: [
        { value: "ja", label: "Japanese" },
        { value: "ko", label: "Korean" },
        { value: "zh", label: "Chinese" },
        { value: "hi", label: "Hindi" },
      ]
    },
    {
      name: "other",
      label: "Other",
      languages: [
        { value: "ar", label: "Arabic" },
      ]
    },
  ];

  const handleFormatChange = (format: string, checked: boolean) => {
    let updatedFormats: string[];

    if (checked) {
      updatedFormats = [...formats, format];
    } else {
      updatedFormats = formats.filter((f) => f !== format);

      // Ensure at least one format is selected
      if (updatedFormats.length === 0) {
        updatedFormats = [format];
        return; // Don't update if trying to uncheck the last format
      }
    }

    setFormats(updatedFormats);
    onFormatChange(updatedFormats);
  };

  const handleLanguageChange = (value: string) => {
    setLanguage(value);
    onLanguageChange(value);
  };

  // Extract all format options for the main format selection logic
  const allFormatOptions = formatCategories.flatMap(category => category.formats);

  // Extract all language options across regions
  const allLanguageOptions = languageRegions.flatMap(region => region.languages);

  // Get all unique language options without duplicates
  const uniqueLanguageOptions = allLanguageOptions.filter((lang, index, self) => 
    index === self.findIndex(t => t.value === lang.value)
  );

  // Generic format formatter for consistent rendering
  const FormatCard = ({ format, selected }: { format: { id: string; label: string; value: string; description: string; icon?: React.ReactNode; popular?: boolean; }, selected: boolean }) => (
    <div 
      key={format.id}
      className={`flex flex-col p-3 rounded-lg border ${selected ? 'border-primary/50' : 'border-black/5'} 
                transition-all duration-200 hover:border-black/20 cursor-pointer
                ${selected ? 'bg-primary/5' : 'bg-white/80'} relative group`}
      onClick={() => handleFormatChange(format.value, !selected)}
    >
      {format.popular && (
        <Badge variant="outline" className="absolute -top-2 -right-2 bg-primary/90 text-white text-[9px] px-1.5 py-0.5">
          Popular
        </Badge>
      )}
      <div className="flex items-center gap-2 mb-1">
        <Checkbox
          id={format.id}
          checked={selected}
          onCheckedChange={(checked) => {
            handleFormatChange(format.value, checked as boolean);
          }}
          className={`${selected ? 'border-primary' : ''} transition-all`}
          onClick={(e) => e.stopPropagation()}
        />
        <div className="flex items-center gap-1.5">
          {format.icon && <span className={`${selected ? 'text-primary' : 'text-muted-foreground'}`}>{format.icon}</span>}
          <Label
            htmlFor={format.id}
            className={`text-sm font-medium cursor-pointer select-none ${selected ? 'text-primary font-semibold' : ''}`}
          >
            {format.label}
          </Label>
        </div>
      </div>
      <p className="text-xs pl-6 opacity-80">{format.description}</p>
    </div>
  );

  return (
    <Card className="w-full border-black/5 shadow-sm overflow-hidden animate-fade-in">
      <CardHeader className="pb-0 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings size={18} className="text-primary" />
            <h2 className="text-xl font-semibold">Output Settings</h2>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <div className="rounded-full bg-muted/30 p-1">
                  <Info size={14} className="text-muted-foreground" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-80">
                <p className="text-sm">Select subtitle formats and language preferences. You can select multiple formats to download at once.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-8">
        <div className="grid gap-8 sm:grid-cols-6">
          {/* Format Selection Section - 4 columns */}
          <div className="sm:col-span-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileType size={16} className="text-primary" />
                <h3 className="font-medium">Subtitle Format</h3>
              </div>
              <Badge variant="outline" className="text-xs font-normal">
                {formats.length} selected
              </Badge>
            </div>
            
            <Tabs defaultValue="popular" className="w-full">
              <TabsList className="grid grid-cols-3 mb-4 bg-muted/30">
                {formatCategories.map((category) => (
                  <TabsTrigger 
                    key={category.name} 
                    value={category.name}
                    className="flex items-center gap-1.5 data-[state=active]:bg-white"
                  >
                    <span>{category.icon}</span>
                    <span>{category.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
              
              {formatCategories.map((category) => (
                <TabsContent key={category.name} value={category.name} className="mt-0">
                  <div className="text-xs text-muted-foreground mb-3">{category.description}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {category.formats.map((format) => (
                      <FormatCard 
                        key={format.id} 
                        format={format} 
                        selected={formats.includes(format.value)} 
                      />
                    ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
            
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted-foreground">
                Select one or more subtitle formats for download
              </p>
              <button 
                onClick={() => {
                  const defaultFormats = ["CLEAN_TEXT", "SRT"];
                  setFormats(defaultFormats);
                  onFormatChange(defaultFormats);
                }} 
                className="text-xs text-primary hover:underline"
              >
                Reset to defaults
              </button>
            </div>
          </div>

          {/* Language Selection and Coin Calculator - 2 columns */}
          <div className="sm:col-span-2 space-y-6">
            {/* Language Selection */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Languages size={16} className="text-primary" />
                <h3 className="font-medium">Subtitle Language</h3>
              </div>

              <Select value={language} onValueChange={handleLanguageChange}>
                <SelectTrigger className="w-full bg-white/80 border-black/10 shadow-sm h-11 input-focus-ring">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent className="max-h-96">
                  {/* Language availability disclaimer */}
                  <div className="px-3 py-2 border-b">
                    <p className="text-xs text-muted-foreground">
                      <strong>Note:</strong> If subtitles are not available in your chosen language, English will be used as a fallback.
                    </p>
                  </div>
                  
                  {languageRegions.map((region) => (
                    <div key={region.name} className="px-2 py-1.5">
                      <div className="text-xs font-semibold text-muted-foreground mb-1 pl-2">{region.label}</div>
                      <div className="grid grid-cols-1 gap-1">
                        {region.languages.map((lang) => (
                          <SelectItem 
                            key={`${region.name}-${lang.value}`} 
                            value={lang.value}
                            className={lang.popular ? 'font-medium' : ''}
                          >
                            {lang.label} {lang.popular && <span className="text-xs text-primary ml-1">•</span>}
                          </SelectItem>
                        ))}
                      </div>
                    </div>
                  ))}
                </SelectContent>
              </Select>
              

            </div>

            {/* Dynamic Coin Calculator */}
            <CoinCalculator 
              videoCount={videoCount}
              formatCount={formats.length}
              isPlaylist={isPlaylist}
            />
          </div>
        </div>
        
        {children}
      </CardContent>
    </Card>
  );
};

export default FormatSelection;
