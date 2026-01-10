'use client';

import { useState, useMemo, useCallback, useRef, useEffect, KeyboardEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { lifeEventTemplates, incomeSources, flows } from '@/lib/api';
import { LifeEventTemplate, LifeEventCategoryGroup, SuggestedChange, IncomeSourceDetail, RecurringFlow } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { SURFACE } from '@/lib/design-tokens';
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
  Search,
  X,
  CreditCard,
  ShoppingCart,
  RefreshCw,
  FileText,
  HeartPulse,
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
  'credit-card': <CreditCard className="h-5 w-5" />,
  'shopping-cart': <ShoppingCart className="h-5 w-5" />,
  'refresh-cw': <RefreshCw className="h-5 w-5" />,
  'file-text': <FileText className="h-5 w-5" />,
  'heart-pulse': <HeartPulse className="h-5 w-5" />,
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
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const templateListRef = useRef<HTMLDivElement>(null);

  const { data: templatesData, isLoading } = useQuery({
    queryKey: ['life-event-templates'],
    queryFn: lifeEventTemplates.list,
    enabled: open,
  });

  // Fetch income sources for source flow selection
  const { data: incomeSourcesData } = useQuery({
    queryKey: ['income-sources'],
    queryFn: incomeSources.list,
    enabled: open && selectedTemplate?.suggestedChanges.some(c => c.requiresSourceFlow && c.sourceFlowType === 'income'),
  });

  // Fetch expense flows for source flow selection
  const { data: flowsData } = useQuery({
    queryKey: ['flows'],
    queryFn: flows.list,
    enabled: open && selectedTemplate?.suggestedChanges.some(c => c.requiresSourceFlow && c.sourceFlowType === 'expense'),
  });

  // Get available income sources for dropdown
  const availableIncomeSources = useMemo(() => {
    if (!incomeSourcesData) return [];
    return incomeSourcesData.map((source: IncomeSourceDetail) => ({
      id: `income_source_${source.id}`,
      name: source.name || 'Income Source',
      amount: parseFloat(source.grossAnnualSalary || source.grossAnnual || '0'),
    }));
  }, [incomeSourcesData]);

  // Get available expense flows for dropdown
  const availableExpenseFlows = useMemo(() => {
    if (!flowsData) return [];
    return flowsData
      .filter((flow: RecurringFlow) => flow.flowType === 'expense')
      .map((flow: RecurringFlow) => ({
        id: flow.id,
        name: flow.name,
        amount: parseFloat(String(flow.amount || '0')),
      }));
  }, [flowsData]);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setSearchQuery('');
      setFocusedIndex(0);
      // Focus search input when dialog opens
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [open]);

  const applyMutation = useMutation({
    mutationFn: (data: {
      templateName: string;
      scenarioId: string;
      effectiveDate: string;
      changeValues: Record<string, Record<string, unknown>>;
    }) => {
      // Use template name as ID since we're using defaults
      return lifeEventTemplates.apply(data.templateName, {
        scenarioId: data.scenarioId,
        effectiveDate: data.effectiveDate,
        changeValues: data.changeValues,
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

  // Flatten all templates for search/keyboard navigation
  const allTemplates = useMemo(() => {
    const templates: Array<{ template: LifeEventTemplate; category: string }> = [];
    categoryGroups.forEach((group) => {
      group.templates.forEach((template) => {
        templates.push({ template, category: group.category });
      });
    });
    return templates;
  }, [categoryGroups]);

  // Filter templates based on search query
  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) return allTemplates;
    const query = searchQuery.toLowerCase();
    return allTemplates.filter(
      ({ template }) =>
        template.name.toLowerCase().includes(query) ||
        template.description.toLowerCase().includes(query) ||
        template.suggestedChanges.some((change) =>
          change.name.toLowerCase().includes(query)
        )
    );
  }, [allTemplates, searchQuery]);

  // Reset focused index when search changes
  useEffect(() => {
    setFocusedIndex(0);
  }, [searchQuery]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (filteredTemplates.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex((prev) =>
            prev < filteredTemplates.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredTemplates.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredTemplates[focusedIndex]) {
            handleSelectTemplate(filteredTemplates[focusedIndex].template);
          }
          break;
        case 'Escape':
          if (searchQuery) {
            e.preventDefault();
            setSearchQuery('');
          }
          break;
      }
    },
    [filteredTemplates, focusedIndex, searchQuery]
  );

  // Scroll focused item into view
  useEffect(() => {
    if (templateListRef.current && searchQuery) {
      const focusedElement = templateListRef.current.querySelector(
        `[data-index="${focusedIndex}"]`
      );
      focusedElement?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [focusedIndex, searchQuery]);

  const handleSelectTemplate = (template: LifeEventTemplate) => {
    setSelectedTemplate(template);
    // Initialize change values from template
    const initialValues: Record<string, ChangeValue> = {};
    template.suggestedChanges.forEach((change, idx) => {
      initialValues[String(idx)] = {
        _skip: !change.isRequired,
        ...change.parametersTemplate,
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
      scenarioId: scenarioId,
      effectiveDate: effectiveDate,
      changeValues: changeValues,
    });
  };

  const renderTemplateList = () => (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={searchInputRef}
          placeholder="Search life events..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="pl-9 pr-9"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Show filtered results when searching */}
      {searchQuery ? (
        <ScrollArea className="h-[400px]">
          <div ref={templateListRef} className="grid gap-3 pr-4">
            {filteredTemplates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No life events found for "{searchQuery}"
              </div>
            ) : (
              filteredTemplates.map(({ template, category }, idx) => (
                <Card
                  key={template.name + idx}
                  data-index={idx}
                  className={cn(
                    SURFACE.card,
                    'cursor-pointer transition-all hover:border-primary hover:shadow-md',
                    'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                    idx === focusedIndex && 'border-primary ring-2 ring-primary/20'
                  )}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSelectTemplate(template)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSelectTemplate(template)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-muted rounded-md">
                          {TEMPLATE_ICONS[template.icon] || <Calendar className="h-5 w-5" />}
                        </div>
                        <div>
                          <CardTitle className="text-base">{template.name}</CardTitle>
                          <span className="text-xs text-muted-foreground capitalize">{category}</span>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <CardDescription>{template.description}</CardDescription>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      ) : (
        /* Show category tabs when not searching */
        <Tabs defaultValue={categoryGroups[0]?.category || 'career'} className="w-full">
          <TabsList className="flex flex-wrap h-auto gap-1 mb-4">
            {categoryGroups.map((group) => (
              <TabsTrigger
                key={group.category}
                value={group.category}
                className="flex items-center gap-2"
              >
                {CATEGORY_ICONS[group.category]}
                <span className="hidden sm:inline">{group.categoryDisplay}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {categoryGroups.map((group) => (
            <TabsContent key={group.category} value={group.category} className="mt-0">
              <ScrollArea className="h-[350px]">
                <div className="grid gap-3 pr-4">
                  {group.templates.map((template, idx) => (
                    <Card
                      key={template.name + idx}
                      className={cn(
                        SURFACE.card,
                        'cursor-pointer transition-all hover:border-primary hover:shadow-md',
                        'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'
                      )}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSelectTemplate(template)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSelectTemplate(template)}
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
                          {template.suggestedChanges.slice(0, 3).map((change, cIdx) => (
                            <Badge key={cIdx} variant="secondary" className="text-xs">
                              {change.name}
                            </Badge>
                          ))}
                          {template.suggestedChanges.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{template.suggestedChanges.length - 3} more
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
      )}

      <p className="text-xs text-muted-foreground text-center">
        Use ↑↓ to navigate, Enter to select
      </p>
    </div>
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
            {selectedTemplate.suggestedChanges.map((change, idx) => (
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
                        {change.isRequired && (
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
                      {/* Source flow selector for MODIFY/REMOVE changes */}
                      {change.requiresSourceFlow && (
                        <div className="space-y-1 sm:col-span-2">
                          <Label htmlFor={`${idx}-source-flow`} className="text-sm">
                            {change.sourceFlowType === 'income' ? 'Select Income Source' : 'Select Expense'}
                            <span className="text-destructive ml-1">*</span>
                          </Label>
                          <Select
                            value={changeValues[String(idx)]?.source_flow_id as string || ''}
                            onValueChange={(value) => handleChangeValue(idx, 'source_flow_id', value)}
                          >
                            <SelectTrigger id={`${idx}-source-flow`}>
                              <SelectValue placeholder={`Choose ${change.sourceFlowType === 'income' ? 'income source' : 'expense'} to ${change.changeType.includes('remove') ? 'remove' : 'modify'}...`} />
                            </SelectTrigger>
                            <SelectContent>
                              {(change.sourceFlowType === 'income' ? availableIncomeSources : availableExpenseFlows).map((item) => (
                                <SelectItem key={item.id} value={item.id}>
                                  {item.name} {item.amount > 0 && `($${Number(item.amount).toLocaleString()}/yr)`}
                                </SelectItem>
                              ))}
                              {(change.sourceFlowType === 'income' ? availableIncomeSources : availableExpenseFlows).length === 0 && (
                                <SelectItem value="" disabled>
                                  No {change.sourceFlowType === 'income' ? 'income sources' : 'expenses'} found
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      {Object.entries(change.parametersTemplate).map(([key, defaultValue]) => {
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
