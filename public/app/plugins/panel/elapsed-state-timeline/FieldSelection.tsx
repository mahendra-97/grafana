import { useState } from 'react';

import { store } from '@grafana/data';
import { Trans, t } from '@grafana/i18n';
import {
  Button,
  Icon,
  MultiCombobox
} from '@grafana/ui';

import { elaspsedStateControlsStyles } from './styles';
import { fieldOptions } from './utils';

interface FieldSelectionProps {
  onApply: (fields: string[]) => void;
  onClose: () => void;
}

export const FieldSelection = ({ onApply, onClose }: FieldSelectionProps) => {
    
  const [localSelectedFields, setLocalSelectedFields] = useState<string[]>(() => {
    const savedFields = store.get('elapsed-state-selected-fields');
    if (!savedFields) {
      return fieldOptions.map((field) => field.value);
    }
    try {
      return JSON.parse(savedFields);
    } catch {
      return [];
    }
  });

  function handleApply() {
    let fieldsToApply = localSelectedFields;
    if (fieldsToApply.length === 0) {
      fieldsToApply = fieldOptions.map((field) => field.value);
    }
    setLocalSelectedFields(fieldsToApply);
    store.set('elapsed-state-selected-fields', JSON.stringify(fieldsToApply));
    onApply(fieldsToApply);
  }

  function closeFieldSelection() {
    const allFields = fieldOptions.map((field) => field.value);
    setLocalSelectedFields(allFields);
    onClose();
  }

  return (
    <div className={elaspsedStateControlsStyles}>
      <MultiCombobox
        options={fieldOptions}
        value={localSelectedFields}
        placeholder={t('elapsed-state-timeline.select-fields', 'Select fields')}
        enableAllOption={true}
        onChange={(values) => {
          setLocalSelectedFields(values.map((value) => value.value));
        }}
      />
      <Button onClick={handleApply}>
        <Trans i18nKey="elapsed-state-timeline.apply">
          Apply
        </Trans>
      </Button>
      <Button>
        <span
          onClick={(event) => {
            event.stopPropagation();
            closeFieldSelection();
          }}
          style={{
            cursor: 'pointer',
          }}
        >
          <Icon name="times" size="lg" />
        </span>
      </Button>
    </div>
  );
};