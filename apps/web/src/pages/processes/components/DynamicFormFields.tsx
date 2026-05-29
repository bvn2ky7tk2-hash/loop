import { Form, Input, InputNumber, DatePicker, Select, TimePicker } from 'antd';
import type { FormField, CriteriaGridValue } from '../../../api/processes.api';
import { CriteriaGridField } from './CriteriaGridField';

interface Props {
  fields: FormField[];
}

export function DynamicFormFields({ fields }: Props) {
  return (
    <>
      {fields.map((field) => (
        <Form.Item
          key={field.name}
          name={field.name}
          label={field.label}
          rules={
            field.required
              ? [{ required: true, message: `Vui lòng nhập ${field.label.toLowerCase()}` }]
              : []
          }
        >
          {field.type === 'text' && (
            <Input placeholder={'placeholder' in field ? field.placeholder : undefined} />
          )}
          {field.type === 'textarea' && (
            <Input.TextArea
              rows={3}
              placeholder={'placeholder' in field ? field.placeholder : undefined}
            />
          )}
          {field.type === 'number' && (
            <InputNumber
              style={{ width: '100%' }}
              placeholder={'placeholder' in field ? field.placeholder : undefined}
              min={'min' in field ? field.min : undefined}
              max={'max' in field ? field.max : undefined}
            />
          )}
          {field.type === 'date' && (
            <DatePicker
              style={{ width: '100%' }}
              format="DD/MM/YYYY"
              placeholder={'placeholder' in field ? (field.placeholder ?? 'Chọn ngày') : 'Chọn ngày'}
            />
          )}
          {field.type === 'select' && (
            <Select
              placeholder={'placeholder' in field ? field.placeholder : undefined}
              options={'options' in field ? field.options : []}
            />
          )}
          {field.type === 'time' && (
            <TimePicker format="HH:mm" minuteStep={15} style={{ width: '100%' }} />
          )}
          {field.type === 'criteria_grid' && (
            <CriteriaGridFormItem
              criteria={field.criteria}
              scoreMin={field.scoreMin}
              scoreMax={field.scoreMax}
            />
          )}
        </Form.Item>
      ))}
    </>
  );
}

// Wrapper để connect CriteriaGridField với Ant Design Form.Item value/onChange
function CriteriaGridFormItem({
  criteria,
  scoreMin,
  scoreMax,
  value,
  onChange,
}: {
  criteria: import('../../../api/processes.api').CriterionConfig[];
  scoreMin: number;
  scoreMax: number;
  value?: CriteriaGridValue;
  onChange?: (v: CriteriaGridValue) => void;
}) {
  const handleChange = (scores: Record<string, number>) => {
    if (!onChange) return;
    const weightedTotal =
      Math.round(
        criteria.reduce((sum, c) => sum + (scores[c.key] ?? 0) * (c.weight / 100), 0) * 100,
      ) / 100;
    onChange({ scores, weightedTotal });
  };

  return (
    <CriteriaGridField
      criteria={criteria}
      scoreMin={scoreMin}
      scoreMax={scoreMax}
      value={value?.scores}
      onChange={handleChange}
    />
  );
}
