"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function PdfSettingsPage() {
  const [pdfConfig, setPdfConfig] = useLocalStorage("pg_pdf_config", {
    includeRecommendations: true,
    headerTitle: "Originality Assessment Report",
    accentColor: "blue",
  });

  const [formData, setFormData] = useState(pdfConfig);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setFormData(pdfConfig);
  }, [pdfConfig]);

  const handleSave = () => {
    setPdfConfig(formData);
    toast.success("PDF configurations updated successfully.");
  };

  if (!isMounted) return null;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">PDF Customization</h3>
        <p className="text-sm text-muted-foreground">
          Configure how your exported PDF reports look and what data they contain.
        </p>
      </div>
      <Separator />
      
      <Card className="border-muted/60 shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Document Structure</CardTitle>
          <CardDescription>Toggle sections and customize branding.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Include Recommendations</Label>
              <p className="text-sm text-muted-foreground">
                Append actionable tips at the end of the report.
              </p>
            </div>
            <Switch 
              checked={formData.includeRecommendations}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, includeRecommendations: checked }))}
            />
          </div>
          
          <Separator />

          <div className="space-y-2">
            <Label htmlFor="headerTitle">Custom Header Title</Label>
            <Input 
              id="headerTitle" 
              value={formData.headerTitle}
              onChange={(e) => setFormData(prev => ({ ...prev, headerTitle: e.target.value }))}
              className="max-w-md"
            />
          </div>
          
          <div className="space-y-2 pt-2">
            <Label>Accent Color</Label>
            <Select 
              value={formData.accentColor} 
              onValueChange={(val) => setFormData(prev => ({ ...prev, accentColor: val || "blue" }))}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select a color" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="blue">Corporate Blue</SelectItem>
                <SelectItem value="emerald">Emerald Green</SelectItem>
                <SelectItem value="slate">Neutral Slate</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground pt-1">
              Used for charts and primary highlights in the document.
            </p>
          </div>

        </CardContent>
        <CardFooter className="border-t px-6 py-4 bg-muted/10">
          <Button onClick={handleSave}>Save Preferences</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
