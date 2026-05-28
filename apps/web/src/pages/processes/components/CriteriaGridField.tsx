import { useMemo } from 'react';
import { InputNumber, Table, Typography, theme as antTheme } from 'antd';
import type { CriterionConfig } from '../../../api/processes.api';

const { useToken } = antTheme;

interface Props {
  criteria: CriterionConfig[];
  scoreMin: number;
  scoreMax: number;
  value?: Record<string, number>;
  onChange?: (value: Record<string, number>) => void;
  readonly?: boolean;
}

function scoreColor(score: number, max: number): string {
  const ratio = score / max;
  if (ratio >= 0.9) return '#52c41a';
  if (ratio >= 0.7) return '#73d13d';
  if (ratio >= 0.5) return '#faad14';
  if (ratio >= 0.3) return '#fa8c16';
  return '#ff4d4f';
}

export function CriteriaGridField({
  criteria,
  scoreMin,
  scoreMax,
  value = {},
  onChange,
  readonly = false,
}: Props) {
  const { token } = useToken();

  const weightedTotal = useMemo(() => {
    if (!criteria.length) return 0;
    const total = criteria.reduce((sum, c) => {
      const score = value[c.key] ?? 0;
      return sum + score * (c.weight / 100);
    }, 0);
    return Math.round(total * 100) / 100;
  }, [criteria, value]);

  const handleChange = (key: string, score: number | null) => {
    if (!onChange) return;
    onChange({ ...value, [key]: score ?? scoreMin });
  };

  const columns = [
    {
      title: 'Tiêu chí đánh giá',
      dataIndex: 'label',
      render: (label: string) => (
        <Typography.Text style={{ fontWeight: 500 }}>{label}</Typography.Text>
      ),
    },
    {
      title: 'Trọng số',
      dataIndex: 'weight',
      width: 90,
      align: 'center' as const,
      render: (w: number) => (
        <Typography.Text style={{ color: token.colorPrimary, fontWeight: 600 }}>
          {w}%
        </Typography.Text>
      ),
    },
    {
      title: `Điểm (${scoreMin}–${scoreMax})`,
      dataIndex: 'key',
      width: 160,
      align: 'center' as const,
      render: (key: string) => {
        const score = value[key];
        if (readonly) {
          return score !== undefined ? (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: scoreColor(score, scoreMax) + '20',
                border: `2px solid ${scoreColor(score, scoreMax)}`,
                fontWeight: 700,
                fontSize: 15,
                color: scoreColor(score, scoreMax),
              }}
            >
              {score}
            </div>
          ) : (
            <Typography.Text type="secondary">—</Typography.Text>
          );
        }
        return (
          <InputNumber
            min={scoreMin}
            max={scoreMax}
            step={1}
            value={score ?? null}
            onChange={(v) => handleChange(key, v)}
            style={{ width: 80 }}
            placeholder={`${scoreMin}–${scoreMax}`}
          />
        );
      },
    },
    {
      title: 'Quy đổi',
      dataIndex: 'key',
      key: 'converted',
      width: 90,
      align: 'center' as const,
      render: (key: string, record: CriterionConfig) => {
        const score = value[key];
        if (score === undefined || score === null) {
          return <Typography.Text type="disabled">—</Typography.Text>;
        }
        const converted = Math.round(score * (record.weight / 100) * 100) / 100;
        return (
          <Typography.Text style={{ color: token.colorSuccess, fontWeight: 600 }}>
            {converted}
          </Typography.Text>
        );
      },
    },
  ];

  const totalColor = scoreColor(weightedTotal, scoreMax);

  return (
    <div>
      <Table
        dataSource={criteria}
        columns={columns}
        rowKey="key"
        size="small"
        pagination={false}
        style={{ marginBottom: 4 }}
        summary={() => (
          <Table.Summary.Row>
            <Table.Summary.Cell index={0} colSpan={3}>
              <Typography.Text strong>Tổng điểm có trọng số</Typography.Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={1} align="center">
              {weightedTotal > 0 ? (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: 48,
                    padding: '2px 8px',
                    borderRadius: 20,
                    background: totalColor + '20',
                    border: `2px solid ${totalColor}`,
                    fontWeight: 700,
                    fontSize: 15,
                    color: totalColor,
                  }}
                >
                  {weightedTotal}
                </div>
              ) : (
                <Typography.Text type="secondary">—</Typography.Text>
              )}
            </Table.Summary.Cell>
          </Table.Summary.Row>
        )}
      />
    </div>
  );
}

// Read-only variant (dùng trong PreviousDataPanel)
export function CriteriaGridReadOnly({
  criteria,
  scoreMin,
  scoreMax,
  scores,
}: {
  criteria: CriterionConfig[];
  scoreMin: number;
  scoreMax: number;
  scores: Record<string, number>;
}) {
  return (
    <CriteriaGridField
      criteria={criteria}
      scoreMin={scoreMin}
      scoreMax={scoreMax}
      value={scores}
      readonly
    />
  );
}
