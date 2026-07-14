"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { Eye, EyeOff } from "lucide-react";

export default function ApiSettingsPage() {
  const [apiConfig, setApiConfig] = useLocalStorage("pg_api_config", {
    apiKey: "",
    baseUrl: "https://www.quetext.com/api",
  });

  const [formData, setFormData] = useState(apiConfig);
  const [isMounted, setIsMounted] = useState(false);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setFormData(apiConfig);
  }, [apiConfig]);

  const handleSave = () => {
    setApiConfig(formData);
    toast.success("API configuration updated successfully.");
  };

  if (!isMounted) return null;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">API Configuration</h3>
        <p className="text-sm text-muted-foreground">
          Manage your connection to the Quetext plagiarism detection engine.
        </p>
      </div>
      <Separator />
      
      <Card className="border-muted/60 shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Quetext Integration</CardTitle>
          <CardDescription>Configure your API keys and endpoints.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="apiKey">Secret API Key</Label>
            <div className="relative max-w-md">
              <Input 
                id="apiKey" 
                type={showKey ? "text" : "password"}
                value={formData.apiKey}
                onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
                className="pr-10 font-mono text-sm"
              />
              <Button 
                variant="ghost" 
                size="sm" 
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
              </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="baseUrl">Base URL Endpoint</Label>
            <Input 
              id="baseUrl" 
              value={formData.baseUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, baseUrl: e.target.value }))}
              className="max-w-md font-mono text-sm"
            />
            <p className="text-[0.8rem] text-muted-foreground">
              Default: https://www.quetext.com/api
            </p>
          </div>
        </CardContent>
        <CardFooter className="border-t px-6 py-4 bg-muted/10 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Keys are stored in your browser's localStorage. Anyone with access to this device can read them — do not use on shared machines.</p>
          <Button onClick={handleSave}>Save Keys</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
