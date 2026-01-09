'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { lifeEventTemplates, scenarios } from '@/lib/api';
import { LifeEventTemplate, LifeEventCategoryGroup, SuggestedChange } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  Briefcase,
  Home,
  Heart,
  GraduationCap,
  Activity,
  DollarSign,
  Sunset,
  TrendingUp,
  UserMinus,
  Key,
  LogOut,
  Baby,
  UserX,
  CheckCircle,
  Car,
  Rocket,
  Gift,
  PiggyBank,
  Calendar,
  ChevronRight,
  Loader2,
} from 'lucide-react';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  career: <Briefcase className="h-5 w-5" />,
  housing: <Home className="h-5 w-5" />,
  family: <Heart className="h-5 w-5" />,
  education: <GraduationCap className="h-5 w-5" />,
  health: <Activity className="h-5 w-5" />,
  financial: <DollarSign className="h-5 w-5" />,
  retirement: <Sunset className="h-5 w-5" />,
};

const TEMPLATE_ICONS: Record<string, React.ReactNode> = {
  briefcase: <Briefcase className="h-5 w-5" />,
  'trending-up': <TrendingUp className="h-5 w-5" />,
  'user-minus': <UserMinus className="h-5 w-5" />,
  home: <Home className="h-5 w-5" />,
  key: <Key className="h-5 w-5" />,
  'log-out': <LogOut className="h-5 w-5" />,
  baby: <Baby className="h-5 w-5" />,
  heart: <Heart className="h-5 w-5" />,
  'user-x': <UserX className="h-5 w-5" />,
  'graduation-cap': <GraduationCap className="h-5 w-5" />,
  'check-circle': <CheckCircle className="h-5 w-5" />,
  sunset: <Sunset className="h-5 w-5" />,
  'piggy-bank': <PiggyBank className="h-5 w-5" />,
  car: <Car className="h-5 w-5" />,
  rocket: <Rocket className="h-5 w-5" />,
  gift: <Gift className="h-5 w-5" />,
  activity: <Activity className="h-5 w-5" />,
  calendar: <Calendar className="h-5 w-5" />,
};

interface LifeEventTemplatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scenarioId: string;
}

interface ChangeValue {
  _skip: boolean;
  [key: string]: unknown;
}

export function LifeEventTemplatesDialog({
  open,
  onOpenChange,
  scenarioId,
}: LifeEventTemplatesDialogProps) {
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState<LifeEventTemplate | null>(null);
  const [effectiveDate, setEffectiveDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [changeValues, setChangeValues] = useState<Record<string, ChangeValue>>({});

  const { data: templatesData, isLoading } = useQuery({
    queryKey: ['life-event-templates'],
    queryFn: lifeEventTemplates.list,
    enabled: open,
  });

  const applyMutation = useMutation({
    mutationFn: (data: {
      templateName: string;
      scenario_id: string;
      effective_date: string;
      change_values: Record<string, Record<string, unknown>>;
    }) => {
      // Use template name as ID since we're using defaults
      return lifeEventTemplates.apply(data.templateName, {
        scenario_id: data.scenario_id,
        effective_date: data.effective_date,
        change_values: data.change_values,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scenarios', scenarioId] });
      queryClient.invalidateQueries({ queryKey: ['scenario-changes', scenarioId] });
      setSelectedTemplate(null);
      setChangeValues({});
      onOpenChange(false);
    },
  });

  const categoryGroups = useMemo(() => {
    return templatesData?.results || [];
  }, [templatesData]);

  const handleSelectTemplate = (template: LifeEventTemplate) => {
    setSelectedTemplate(template);
    // Initialize change values from template
    const initialValues: Record<string, ChangeValue> = {};
    template.suggested_changes.forEach((change, idx) => {
      initialValues[String(idx)] = {
        _skip: !change.is_required,
        ...change.parameters_template,
      };
    });
    setChangeValues(initialValues);
  };

  const handleChangeValue = (changeIdx: number, field: string, value: unknown) => {
    setChangeValues((prev) => ({
      ...prev,
      [String(changeIdx)]: {
        ...prev[String(changeIdx)],
        [field]: value,
      },
    }));
  };

  const handleApply = () => {
    if (!selectedTemplate) return;

    applyMutation.mutate({
      templateName: selectedTemplate.name,
      scenario_id: scenarioId,
      effective_date: effectiveDate,
      change_values: changeValues,
    });
  };

  const renderTemplateList = () => (
    <Tabs defaultValue={categoryGroups[0]?.category || 'career'} className="w-full">
      <TabsList className="flex flex-wrap h-auto gap-1 mb-4">
        {categoryGroups.map((group) => (
          <TabsTrigger
            key={group.category}
            value={group.category}
            className="flex items-center gap-2"
          >
            {CATEGORY_ICONS[group.category]}
            <span className="hidden sm:inline">{group.category_display}</span>
          </TabsTrigger>
        ))}
      </TabsList>

      {categoryGroups.map((group) => (
        <TabsContent key={group.category} value={group.category} className="mt-0">
          <ScrollArea className="h-[400px]">
            <div className="grid gap-3 pr-4">
              {group.templates.map((template, idx) => (
                <Card
                  key={template.name + idx}
                  className={cn(
                    'cursor-pointer transition-all hover:border-primary',
                    'hover:shadow-md'
                  )}
                  onClick={() => handleSelectTemplate(template)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-muted rounded-md">
                          {TEMPLATE_ICONS[template.icon] || <Calendar className="h-5 w-5" />}
                        </div>
                        <CardTitle className="text-base">{template.name}</CardTitle>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <CardDescription>{template.description}</CardDescription>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {template.suggested_changes.slice(0, 3).map((change, cIdx) => (
                        <Badge key={cIdx} variant="secondary" className="text-xs">
                          {change.name}
                        </Badge>
                      ))}
                      {template.suggested_changes.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{template.suggested_changes.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      ))}
    </Tabs>
  );

  const renderChangeForm = () => {
    if (!selectedTemplate) return null;

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b">
          <Button variant="ghost" size="sm" onClick={() => setSelectedTemplate(null)}>
            Back
          </Button>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-muted rounded-md">
              {TEMPLATE_ICONS[selectedTemplate.icon] || <Calendar className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="font-semibold">{selectedTemplate.name}</h3>
              <p className="text-sm text-muted-foreground">{selectedTemplate.description}</p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="effectiveDate">When will this change take effect?</Label>
          <Input
            id="effectiveDate"
            type="date"
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
          />
        </div>

        <ScrollArea className="h-[350px]">
          <div className="space-y-4 pr-4">
            <h4 className="font-medium">Changes to Apply</h4>
            {selectedTemplate.suggested_changes.map((change, idx) => (
              <Card key={idx} className={cn(
                changeValues[String(idx)]?._skip && 'opacity-50'
              )}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`change-${idx}`}
                        checked={!changeValues[String(idx)]?._skip}
                        onCheckedChange={(checked) =>
                          handleChangeValue(idx, '_skip', !checked)
                        }
                      />
                      <Label htmlFor={`change-${idx}`} className="font-medium cursor-pointer">
                        {change.name}
                        {change.is_required && (
                          <Badge variant="destructive" className="ml-2 text-xs">
                            Required
                          </Badge>
                        )}
                      </Label>
                    </div>
                  </div>
                  <CardDescription className="ml-6">{change.description}</CardDescription>
                </CardHeader>
                {!changeValues[String(idx)]?._skip && (
                  <CardContent className="pt-0 ml-6">
                    <div className="grid gap-3 sm:grid-cols-2">
                      {Object.entries(change.parameters_template).map(([key, defaultValue]) => {
                        if (key === '_skip') return null;

                        const value = changeValues[String(idx)]?.[key] ?? defaultValue;
                        const label = key
                          .replace(/_/g, ' ')
                          .replace(/\b\w/g, (c) => c.toUpperCase());

                        // Determine input type based on key and value
                        let inputType = 'text';
                        if (key.includes('amount') || key.includes('payment') || key.includes('principal') || key.includes('value') || key.includes('costs') || key.includes('price')) {
                          inputType = 'number';
                        } else if (key.includes('rate') || key.includes('percentage')) {
                          inputType = 'number';
                        } else if (key.includes('months') || key.includes('term')) {
                          inputType = 'number';
                        }

                        return (
                          <div key={key} className="space-y-1">
                            <Label htmlFor={`${idx}-${key}`} className="text-sm">
                              {label}
                            </Label>
                            <Input
                              id={`${idx}-${key}`}
                              type={inputType}
                              value={String(value)}
                              onChange={(e) => {
                                const newValue = inputType === 'number'
                                  ? parseFloat(e.target.value) || 0
                                  : e.target.value;
                                handleChangeValue(idx, key, newValue);
                              }}
                              placeholder={`Enter ${label.toLowerCase()}`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {selectedTemplate ? 'Configure Life Event' : 'Add Life Event'}
          </DialogTitle>
          <DialogDescription>
            {selectedTemplate
              ? 'Customize the changes for this life event'
              : 'Choose a life event template to quickly add common changes to your scenario.'}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : selectedTemplate ? (
          renderChangeForm()
        ) : (
          renderTemplateList()
        )}

        {selectedTemplate && (
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedTemplate(null)}>
              Back
            </Button>
            <Button
              onClick={handleApply}
              disabled={applyMutation.isPending}
            >
              {applyMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Applying...
                </>
              ) : (
                'Apply Changes'
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
