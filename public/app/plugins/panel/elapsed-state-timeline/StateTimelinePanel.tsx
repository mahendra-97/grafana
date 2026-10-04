import React, { useEffect, useRef, useMemo, useState } from 'react';

import { DashboardCursorSync, FieldType, store, type PanelProps, useDataLinksContext } from '@grafana/data';
import { Trans } from '@grafana/i18n';
import { locationService, PanelDataErrorView } from '@grafana/runtime';
import {
  AxisPlacement,
  EventBusPlugin,
  Icon,
  TooltipDisplayMode,
  TooltipPlugin2,
  usePanelContext,
  useTheme2,
  XAxisInteractionAreaPlugin,
} from '@grafana/ui';
import { type TimeRange2, TooltipHoverMode } from '@grafana/ui/internal';
import { TimelineChart } from 'app/core/components/TimelineChart/TimelineChart';
import {
  prepareTimelineFields,
  prepareTimelineLegendItems,
  TimelineMode,
} from 'app/core/components/TimelineChart/utils';
import { ElaspedTimeCheckerEvent, FieldSelectionEvent } from 'app/features/dashboard-scene/scene/PanelMenuBehavior';

import { AnnotationsPlugin } from '../timeseries/plugins/AnnotationsPlugin';
import { OutsideRangePlugin } from '../timeseries/plugins/OutsideRangePlugin';
import { getXAnnotationFrames } from '../timeseries/plugins/utils';
import { getTimezones } from '../timeseries/utils';

import { FieldSelection } from './FieldSelection';
import { StateTimelineTooltip } from './StateTimelineTooltip';
import { TimeMarker } from './TimeMarker';
import { usePagination } from './hooks';
import { type Options } from './panelcfg.gen';
import { containerStyles, checkDurationButton, elapsedStateControlsContainer, timeDifference, menuItemFieldcloseIcon } from './styles';
import { fieldOptions } from './utils';

// const CALENDAR_TIME_THRESHOLD_MS = Date.UTC(2000, 0, 1);

function isElapsedTimeModeEnabled(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const params = new URLSearchParams(window.location.search);

  return params.get('elapsedTimeMode') === 'true' || params.get('var-elapsedTimeMode') === 'true';
}

const ELAPSED_TIME_MODE_CHANGE_EVENT = 'elapsed-time-mode-change';

function ensureElapsedTimeModeInUrl(): void {
  if (isElapsedTimeModeEnabled()) {
    return;
  }

  locationService.partial(
    {
      elapsedTimeMode: 'true',
    },
    true
  );

  window.dispatchEvent(new Event(ELAPSED_TIME_MODE_CHANGE_EVENT));
}

interface TimelinePanelProps extends PanelProps<Options> {}

export const ElapsedStateTimelinePanel = ({
  data,
  timeRange,
  timeZone,
  options,
  width,
  height,
  fieldConfig,
  replaceVariables,
  onChangeTimeRange,
  id: panelId,
}: TimelinePanelProps) => {
  const theme = useTheme2();

  useEffect(() => {
    ensureElapsedTimeModeInUrl();
  }, []);

  // temp range set for adding new annotation set by TooltipPlugin2, consumed by AnnotationPlugin2
  const [newAnnotationRange, setNewAnnotationRange] = useState<TimeRange2 | null>(null);
  const { sync, eventsScope, canAddAnnotations, eventBus, canExecuteActions } = usePanelContext();
  const [showTimeMarker, setShowTimeMarker] = useState(false);
  const [showTimeDurationButton, setShowTimeDurationButton] = useState(store.get('elapsed-time-checker-enabled') === 'true');
  const [showFieldSelection, setShowFieldSelection] = useState(store.get('field-selection-enabled') === 'true');

  const [startMarkerPosition, setStartMarkerPosition] = useState(30);
  const [endMarkerPosition, setEndMarkerPosition] = useState(70);

  const [draggingMarker, setDraggingMarker] = useState<'start' | 'end' | null>(null);

  const timelineRef = useRef<HTMLDivElement>(null);

  const getTimestampFromPosition = (position: number) => {
    const startTimestamp = timeRange.from.valueOf();
    const endTimestamp = timeRange.to.valueOf();

    return (
      startTimestamp + (position / 100) * (endTimestamp - startTimestamp)
    );
  };

  const startMarkerTime = getTimestampFromPosition(startMarkerPosition);
  const endMarkerTime = getTimestampFromPosition(endMarkerPosition);

  const markerDuration = Math.abs(endMarkerTime - startMarkerTime);

  const formatDuration = (durationMs: number) => {
    const totalMilliseconds = Math.floor(durationMs);
    const hours = Math.floor(totalMilliseconds / 3600000);
    const minutes = Math.floor((totalMilliseconds % 3600000) / 60000);
    const seconds = Math.floor((totalMilliseconds % 60000) / 1000);
    const milliseconds = totalMilliseconds % 1000;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}:${String(milliseconds).padStart(3, '0')}`;
  };

  const handleMarkerPointerDown = (event: React.PointerEvent, marker: 'start' | 'end') => {
    event.preventDefault();
    setDraggingMarker(marker);
  };

  const handleMarkerPointerMove = (event: React.PointerEvent) => {
    if (!draggingMarker) {
      return;
    }
    const timelineElement = timelineRef.current;
    if (!timelineElement) {
      return;
    }

    const plotArea = timelineElement.querySelector('.u-over');
    if (!plotArea) {
      return;
    }
    let rect = plotArea.getBoundingClientRect();
    let x = event.clientX - rect.left;

    x = Math.max(0, Math.min(x, rect.width));

    const position = (x / rect.width) * 100;

    if (draggingMarker === 'start') {
      setStartMarkerPosition(position);
    }

    if (draggingMarker === 'end') {
      setEndMarkerPosition(position);
    }
  };

  const handleMarkerPointerUp = () => {
    setDraggingMarker(null);
  };

  const { dataLinkPostProcessor } = useDataLinksContext();

  const userCanExecuteActions = useMemo(() => canExecuteActions?.() ?? false, [canExecuteActions]);
  const cursorSync = sync?.() ?? DashboardCursorSync.Off;

  const [appliedFields, setAppliedFields] = useState<string[]>(() => {
    const savedFields = store.get('elapsed-state-selected-fields');
    if (!savedFields) {
      return [];
    }
    try {
      return JSON.parse(savedFields);
    } catch {
      return [];
    }
  });

  const telemetryId = replaceVariables('$telemetry_id');
  const previousTelemetryId = useRef(telemetryId);

  useEffect(() => {
    const elapsedSubscription = eventBus.getStream(ElaspedTimeCheckerEvent).subscribe((event) => {
      if (event.payload.panelId !== panelId) {
        return;
      }
      setShowTimeDurationButton(event.payload.enabled);
    });
    const fieldSubscription = eventBus.getStream(FieldSelectionEvent).subscribe((event) => {
      if (event.payload.panelId !== panelId) {
        return;
      }
      setShowFieldSelection(event.payload.enabled);
    });
    return () => {
      elapsedSubscription.unsubscribe();
      fieldSubscription.unsubscribe();
    };
  }, [eventBus, panelId]);

  useEffect(() => {
    if (previousTelemetryId.current !== telemetryId) {
      let allFields = fieldOptions.map((field) => field.value);
      store.set("elapsed-state-selected-fields", JSON.stringify(allFields));
      setAppliedFields(allFields);
      previousTelemetryId.current = telemetryId;
    }
  }, [telemetryId]);

  const handleApplyFields = (fields: string[]) => {
    setAppliedFields(fields);
  };

  const handleFieldSelectionClose = () => {
    const allFields = fieldOptions.map((field) => field.value);
    setShowFieldSelection(false);
    setAppliedFields(allFields);
    store.set("elapsed-state-selected-fields", JSON.stringify(allFields));
    store.set('field-selection-enabled', 'false');
  };

  const filteredSeries = useMemo(() => {
    if (appliedFields.length === 0) {
      return data.series;
    }
    return data.series.map((frame) => ({
      ...frame,
      fields: frame.fields.filter((field) => field.type === FieldType.time || appliedFields.includes(field.name)),
    }));
  }, [data.series, appliedFields]);
  
  const { frames, warn } = useMemo(
    () => prepareTimelineFields(filteredSeries, options.mergeValues ?? true, timeRange, theme),
    [filteredSeries, options.mergeValues, timeRange, theme]
  );

  const { paginatedFrames, paginationRev, paginationElement, paginationHeight } = usePagination(
    frames,
    options.perPage
  );

  const legendItems = useMemo(
    () => prepareTimelineLegendItems(paginatedFrames, options.legend, theme),
    [paginatedFrames, options.legend, theme]
  );

  const timezones = useMemo(() => getTimezones(options.timezone, timeZone), [options.timezone, timeZone]);

  if (!paginatedFrames || typeof warn === 'string') {
    return <PanelDataErrorView panelId={panelId} fieldConfig={fieldConfig} data={data} message={warn} needsTimeField />;
  }

  const enableAnnotationCreation = Boolean(canAddAnnotations && canAddAnnotations());

  return (
    <div
      ref={timelineRef}
      className={containerStyles}
      onPointerMove={handleMarkerPointerMove}
      onPointerUp={handleMarkerPointerUp}
      onPointerLeave={handleMarkerPointerUp}
    >
      <div className={elapsedStateControlsContainer}>
        {showTimeDurationButton && (
          <button
            onClick={() => setShowTimeMarker((prev) => prev === false ? true : true)}
            className={checkDurationButton}
          >
            <Trans i18nKey="elapsed-state-timeline.check-time-duration">
              {!showTimeMarker ? 'Check Time Difference' :
                (
                  <div className={timeDifference}>
                    <span>
                      Time Difference - {formatDuration(markerDuration)}
                    </span>
                    <span
                      onClick={(event) => {
                        event.stopPropagation();
                        setShowTimeDurationButton(false);
                        setShowTimeMarker(false);
                        store.set('elapsed-time-checker-enabled', 'false');
                      }}
                      className={menuItemFieldcloseIcon}
                    >
                      <Icon name="times" size="lg" />
                    </span>
                  </div>
                )
              }
            </Trans>
          </button>
        )
        }
        {showFieldSelection && (
          <FieldSelection
            key={previousTelemetryId.current}
            onApply={handleApplyFields}
            onClose={handleFieldSelectionClose}
          />
        )}
      </div>
      <TimelineChart
        key={appliedFields.join('|')}
        theme={theme}
        frames={paginatedFrames}
        structureRev={data.structureRev}
        paginationRev={paginationRev}
        timeRange={timeRange}
        timeZone={timezones}
        width={width}
        height={height - paginationHeight}
        legendItems={legendItems}
        annotations={options.annotations}
        {...options}
        mode={TimelineMode.Changes}
        replaceVariables={replaceVariables}
        dataLinkPostProcessor={dataLinkPostProcessor}
        cursorSync={cursorSync}
        annotationLanes={options.annotations?.multiLane ? getXAnnotationFrames(data.annotations).length : undefined}
      >
        {(builder, alignedFrame) => {
          return (
            <>
              {cursorSync !== DashboardCursorSync.Off && (
                <EventBusPlugin config={builder} eventBus={eventBus} frame={alignedFrame} />
              )}
              <XAxisInteractionAreaPlugin config={builder} queryZoom={onChangeTimeRange} />
              {options.tooltip.mode !== TooltipDisplayMode.None && (
                <TooltipPlugin2
                  config={builder}
                  hoverMode={
                    options.tooltip.mode === TooltipDisplayMode.Multi ? TooltipHoverMode.xAll : TooltipHoverMode.xOne
                  }
                  queryZoom={onChangeTimeRange}
                  syncMode={cursorSync}
                  syncScope={eventsScope}
                  getDataLinks={(seriesIdx, dataIdx) =>
                    alignedFrame.fields[seriesIdx].getLinks?.({ valueRowIndex: dataIdx }) ?? []
                  }
                  render={(u, dataIdxs, seriesIdx, isPinned, dismiss, timeRange2, viaSync, dataLinks) => {
                    if (enableAnnotationCreation && timeRange2 != null) {
                      setNewAnnotationRange(timeRange2);
                      dismiss();
                      return;
                    }

                    const annotate = () => {
                      let xVal = u.posToVal(u.cursor.left!, 'x');

                      setNewAnnotationRange({ from: xVal, to: xVal });
                      dismiss();
                    };

                    return (
                      <StateTimelineTooltip
                        series={alignedFrame}
                        dataIdxs={dataIdxs}
                        seriesIdx={seriesIdx}
                        mode={viaSync ? TooltipDisplayMode.Multi : options.tooltip.mode}
                        sortOrder={options.tooltip.sort}
                        isPinned={isPinned}
                        timeRange={timeRange}
                        annotate={enableAnnotationCreation ? annotate : undefined}
                        withDuration={true}
                        maxHeight={options.tooltip.maxHeight}
                        replaceVariables={replaceVariables}
                        dataLinks={dataLinks}
                        canExecuteActions={userCanExecuteActions}
                      />
                    );
                  }}
                  maxWidth={options.tooltip.maxWidth}
                />
              )}
              {alignedFrame.fields[0].config.custom?.axisPlacement !== AxisPlacement.Hidden && (
                <AnnotationsPlugin
                  replaceVariables={replaceVariables}
                  options={options.annotations}
                  annotations={data.annotations}
                  config={builder}
                  timeZone={timeZone}
                  newRange={newAnnotationRange}
                  setNewRange={setNewAnnotationRange}
                  canvasRegionRendering={false}
                />
              )}
              <OutsideRangePlugin config={builder} onChangeTimeRange={onChangeTimeRange} />
            </>
          );
        }}
      </TimelineChart>
      {paginationElement}
      {showTimeMarker && (
        <>
          <TimeMarker
            position={startMarkerPosition}
            type="start"
            onPointerDown={handleMarkerPointerDown}
          />
          <TimeMarker
            position={endMarkerPosition}
            type="end"
            onPointerDown={handleMarkerPointerDown}
          />
        </>
      )}
    </div>
  );
};
