"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useLocalStorage } from "@/hooks/use-local-storage";

export default function ProfileSettingsPage() {
  const [profile, setProfile] = useLocalStorage("pg_profile", {
    name: "Alex Doe",
    email: "alex.doe@example.com",
    company: "Acme Corp",
  });

  // Local state for the form so it doesn't instantly save on every keystroke
  const [formData, setFormData] = useState(profile);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setFormData(profile);
  }, [profile]);

  const handleSave = () => {
    setProfile(formData);
    toast.success("Profile settings updated successfully.");
  };

  if (!isMounted) return null; // Prevent hydration mismatch

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Profile</h3>
        <p className="text-sm text-muted-foreground">
          This is how others will see you on the site.
        </p>
      </div>
      <Separator />
      
      <Card className="border-muted/60 shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Personal Information</CardTitle>
          <CardDescription>Update your personal details and company association.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Display Name</Label>
            <Input 
              id="name" 
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="max-w-md"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input 
              id="email" 
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="max-w-md"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company">Company</Label>
            <Input 
              id="company" 
              value={formData.company}
              onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
              className="max-w-md"
            />
          </div>
          
          <Button onClick={handleSave}>Save Profile</Button>
        </CardContent>
      </Card>
    </div>
  );
}
