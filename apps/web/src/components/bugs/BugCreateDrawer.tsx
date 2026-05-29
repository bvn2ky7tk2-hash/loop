import { useState } from 'react';
import {
  Form, Input, Select, Upload, Button,
  Radio, Space, App, DatePicker, InputNumber, Checkbox, Alert,
} from 'antd';
import { CenteredModal } from '../ui/CenteredModal';
import { PlusOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import type { UploadFile } from 'antd';
import { projectsApi } from '../../api/projects';
import { UserSelect } from '../selects';
import { tasksApi } from '../../api/tasks';
import { useCreateBug, useUploadBugAttachment, type BugSeverity } from '../../api/bugs.api';

const SEVERITY_COLORS: Record<BugSeverity, string> = {
  CRITICAL: '#FF4D4F',
  HIGH:     '#FA8C16',
  MEDIUM:   '#FADB14',
  LOW:      '#52C41A',
};

interface Props {
  open:    boolean;
  onClose: () => void;
}

export function BugCreateDrawer({ open, onClose }: Props) {
  const { message, modal } = App.useApp();
  const [form] = Form.useForm();
  const [isDirty, setIsDirty] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  const itemType = Form.useWatch('itemType', form);

  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: projectsApi.list });
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks-tree', selectedProject],
    queryFn:  () => selectedProject ? tasksApi.tree(selectedProject) : Promise.resolve([]),
    enabled:  !!selectedProject,
  });
  const { data: members = [] } = useQuery({
    queryKey: ['project-members', selectedProject],
    queryFn:  () => selectedProject ? projectsApi.getMembers(selectedProject) : Promise.resolve([]),
    enabled:  !!selectedProject,
  });

  const createBug    = useCreateBug();
  const uploadAttach = useUploadBugAttachment();

  const flatTasks = (arr: typeof tasks): typeof tasks => arr.flatMap((t) => [t, ...flatTasks(t.children ?? [])]);

  const handleClose = () => {
    if (isDirty) {
      modal.confirm({
        title:   'Bạn có thay đổi chưa lưu. Đóng không?',
        okText:  'Đóng',
        onOk:    () => { form.resetFields(); setIsDirty(false); setFileList([]); onClose(); },
      });
    } else {
      form.resetFields();
      setFileList([]);
      onClose();
    }
  };

  const handleFinish = async (values: any) => {
    try {
      const bug = await createBug.mutateAsync({
        projectId:      values.projectId,
        taskIds:        values.taskIds ?? [],
        title:          values.title,
        description:    values.description,
        severity:       values.severity ?? 'MEDIUM',
        assigneeId:     values.assigneeId,
        itemType:       values.itemType ?? 'BUG',
        isCR:           values.isCR ?? false,
        requesterName:  values.requesterName,
        dueDate:        values.dueDate ? values.dueDate.format('YYYY-MM-DD') : undefined,
        estimatedHours: values.estimatedHours,
      });

      for (const f of fileList) {
        if (f.originFileObj) {
          await uploadAttach.mutateAsync({ id: bug.id, file: f.originFileObj });
        }
      }

      message.success(`${values.itemType === 'ISSUE' ? 'Issue' : 'Bug'} đã được tạo`);
      form.resetFields();
      setIsDirty(false);
      setFileList([]);
      onClose();
    } catch {
      message.error('Tạo thất bại');
    }
  };

  const drawerTitle = `Tạo ${itemType === 'ISSUE' ? 'Issue' : 'Bug'} Mới`;

  return (
    <CenteredModal
      title={drawerTitle}
      width={560}
      open={open}
      onClose={handleClose}
      footer={
        <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
          <Button onClick={handleClose}>Huỷ</Button>
          <Button type="primary" onClick={() => form.submit()} loading={createBug.isPending} disabled={createBug.isPending}>
            Tạo {itemType === 'ISSUE' ? 'Issue' : 'Bug'}
          </Button>
        </Space>
      }
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        onValuesChange={() => setIsDirty(true)}
        initialValues={{ severity: 'MEDIUM', itemType: 'BUG' }}
      >
        <Form.Item name="itemType" label="Loại" initialValue="BUG">
          <Radio.Group buttonStyle="solid">
            <Radio.Button value="BUG" style={{ color: '#FF4D4F' }}>🐛 Bug</Radio.Button>
            <Radio.Button value="ISSUE" style={{ color: '#1677FF' }}>📋 Issue</Radio.Button>
          </Radio.Group>
        </Form.Item>

        <Form.Item noStyle shouldUpdate={(prev, curr) => prev.itemType !== curr.itemType}>
          {({ getFieldValue }) => getFieldValue('itemType') === 'ISSUE' && (
            <>
              <Form.Item name="isCR" valuePropName="checked">
                <Checkbox>Đây là Change Request (CR) — cần PM phê duyệt trước khi thực hiện</Checkbox>
              </Form.Item>
              <Form.Item noStyle shouldUpdate={(p, c) => p.isCR !== c.isCR}>
                {({ getFieldValue: gfv }) => gfv('isCR') && (
                  <Alert type="info" showIcon message="CR sẽ tự động chuyển sang trạng thái PENDING_REVIEW và cần PM phê duyệt." style={{ marginBottom: 16 }} />
                )}
              </Form.Item>
            </>
          )}
        </Form.Item>

        <Form.Item name="projectId" label="Dự án" rules={[{ required: true, message: 'Chọn dự án' }]}>
          <Select
            showSearch
            placeholder="Chọn dự án"
            options={projects.map((p) => ({ value: p.id, label: p.name }))}
            onChange={(val) => {
              setSelectedProject(val);
              form.setFieldValue('taskIds', []);
              form.setFieldValue('assigneeId', undefined);
            }}
          />
        </Form.Item>

        <Form.Item name="taskIds" label="Task(s) liên quan">
          <Select
            mode="multiple"
            disabled={!selectedProject}
            placeholder={selectedProject ? 'Chọn task...' : 'Chọn dự án trước'}
            options={flatTasks(tasks).map((t) => ({ value: t.id, label: t.title }))}
          />
        </Form.Item>

        <Form.Item name="title" label="Tiêu đề" rules={[{ required: true, message: 'Nhập tiêu đề' }]}>
          <Input placeholder="Mô tả ngắn" />
        </Form.Item>

        <Form.Item name="reporterId" label="Người báo cáo">
          <UserSelect allowClear placeholder="Chọn người báo cáo (tùy chọn)" />
        </Form.Item>

        <Form.Item name="severity" label="Mức độ" rules={[{ required: true }]}>
          <Radio.Group>
            {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as BugSeverity[]).map((s) => (
              <Radio.Button
                key={s}
                value={s}
                style={{ borderColor: SEVERITY_COLORS[s], color: SEVERITY_COLORS[s] }}
              >
                {s}
              </Radio.Button>
            ))}
          </Radio.Group>
        </Form.Item>

        <Form.Item name="description" label="Mô tả">
          <Input.TextArea rows={4} placeholder="Mô tả chi tiết, bước tái hiện, kết quả mong đợi..." />
        </Form.Item>

        <Form.Item name="dueDate" label="Hạn xử lý">
          <DatePicker style={{ width: '100%' }} placeholder="Hạn từ khách hàng (nếu có)" />
        </Form.Item>

        <Form.Item name="estimatedHours" label="Ước lượng (giờ)">
          <InputNumber min={0} style={{ width: '100%' }} placeholder="Ước lượng giờ xử lý" />
        </Form.Item>

        <Form.Item name="assigneeId" label="Người xử lý">
          <Select
            showSearch
            allowClear
            disabled={!selectedProject}
            placeholder={selectedProject ? 'Chọn người xử lý...' : 'Chọn dự án trước'}
            filterOption={(input, opt) =>
              (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={members.map((m) => ({
              value: m.employeeId,
              label: m.employee?.fullName ?? m.employeeId,
            }))}
          />
        </Form.Item>

        <Form.Item label="Đính kèm ảnh">
          <Upload
            listType="picture-card"
            accept="image/*"
            fileList={fileList}
            onChange={({ fileList: fl }) => setFileList(fl)}
            maxCount={5}
            beforeUpload={(file) => {
              if (!file.type.startsWith('image/')) {
                message.error('Chỉ chấp nhận file ảnh');
                return Upload.LIST_IGNORE;
              }
              if (file.size > 10 * 1024 * 1024) {
                message.error('File không được vượt quá 10MB');
                return Upload.LIST_IGNORE;
              }
              return false;
            }}
          >
            {fileList.length < 5 && (
              <div><PlusOutlined /><div style={{ marginTop: 8 }}>Thêm ảnh</div></div>
            )}
          </Upload>
        </Form.Item>
      </Form>
    </CenteredModal>
  );
}
