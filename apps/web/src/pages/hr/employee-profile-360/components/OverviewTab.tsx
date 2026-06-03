import { Descriptions, Typography, Row, Col } from 'antd';
import dayjs from 'dayjs';

import { GENDER_LABEL, MARITAL_LABEL } from '../constants';
import type { Palette, Personal } from '../types';

const { Text } = Typography;

interface OverviewTabProps {
  personal: Personal | undefined;
  cardStyle: React.CSSProperties;
  palette: Palette;
}

export function OverviewTab({ personal, cardStyle, palette }: OverviewTabProps) {
  const { textPrimary, textMuted, linkColor } = palette;
  return (
    <Row gutter={[16, 16]}>
      {/* Thông tin cá nhân */}
      <Col xs={24} md={12}>
        <div style={cardStyle}>
          <Text strong style={{ color: textPrimary, display: 'block', marginBottom: 14, fontSize: 14 }}>Thông tin cá nhân</Text>
          <Descriptions column={1} size="small">
            <Descriptions.Item label={<Text style={{ color: textMuted }}>Ngày sinh</Text>}>
              <Text style={{ color: textPrimary }}>{personal?.birthdate ? dayjs(personal.birthdate).format('DD/MM/YYYY') : '—'}</Text>
            </Descriptions.Item>
            <Descriptions.Item label={<Text style={{ color: textMuted }}>Thâm niên công tác</Text>}>
              <Text style={{ color: textPrimary, fontWeight: 600 }}>
                {personal?.tenure?.formatted ?? '—'}
                {personal?.startDate ? <Text style={{ color: textMuted, fontWeight: 400 }}> (từ {dayjs(personal.startDate).format('DD/MM/YYYY')})</Text> : null}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label={<Text style={{ color: textMuted }}>Giới tính</Text>}>
              <Text style={{ color: textPrimary }}>{personal?.gender ? GENDER_LABEL[personal.gender] ?? personal.gender : '—'}</Text>
            </Descriptions.Item>
            <Descriptions.Item label={<Text style={{ color: textMuted }}>Tình trạng hôn nhân</Text>}>
              <Text style={{ color: textPrimary }}>{personal?.maritalStatus ? MARITAL_LABEL[personal.maritalStatus] ?? personal.maritalStatus : '—'}</Text>
            </Descriptions.Item>
            <Descriptions.Item label={<Text style={{ color: textMuted }}>Quê quán</Text>}>
              <Text style={{ color: textPrimary }}>{personal?.hometown ?? '—'}</Text>
            </Descriptions.Item>
            <Descriptions.Item label={<Text style={{ color: textMuted }}>Nơi sinh</Text>}>
              <Text style={{ color: textPrimary }}>{personal?.placeOfBirth ?? '—'}</Text>
            </Descriptions.Item>
            <Descriptions.Item label={<Text style={{ color: textMuted }}>Dân tộc</Text>}>
              <Text style={{ color: textPrimary }}>{personal?.ethnicity ?? '—'}</Text>
            </Descriptions.Item>
            <Descriptions.Item label={<Text style={{ color: textMuted }}>Tôn giáo</Text>}>
              <Text style={{ color: textPrimary }}>{personal?.religion ?? '—'}</Text>
            </Descriptions.Item>
            <Descriptions.Item label={<Text style={{ color: textMuted }}>Quốc tịch</Text>}>
              <Text style={{ color: textPrimary }}>{personal?.nationality ?? '—'}</Text>
            </Descriptions.Item>
            <Descriptions.Item label={<Text style={{ color: textMuted }}>Email</Text>}>
              {personal?.email
                ? <a href={`mailto:${personal.email}`} style={{ color: linkColor }}>{personal.email}</a>
                : <Text style={{ color: textMuted }}>—</Text>}
            </Descriptions.Item>
            <Descriptions.Item label={<Text style={{ color: textMuted }}>Điện thoại</Text>}>
              {personal?.phoneNumber
                ? <a href={`tel:${personal.phoneNumber}`} style={{ color: linkColor }}>{personal.phoneNumber}</a>
                : <Text style={{ color: textMuted }}>—</Text>}
            </Descriptions.Item>
          </Descriptions>
        </div>
      </Col>

      {/* Giấy tờ tùy thân */}
      <Col xs={24} md={12}>
        <div style={cardStyle}>
          <Text strong style={{ color: textPrimary, display: 'block', marginBottom: 14, fontSize: 14 }}>Giấy tờ tùy thân</Text>
          <Descriptions column={1} size="small">
            <Descriptions.Item label={<Text style={{ color: textMuted }}>Loại giấy tờ</Text>}>
              <Text style={{ color: textPrimary }}>{personal?.idType ?? '—'}</Text>
            </Descriptions.Item>
            <Descriptions.Item label={<Text style={{ color: textMuted }}>Số CMND/CCCD</Text>}>
              <Text style={{ color: textPrimary }}>{personal?.idNumber ?? '—'}</Text>
            </Descriptions.Item>
            <Descriptions.Item label={<Text style={{ color: textMuted }}>Ngày cấp</Text>}>
              <Text style={{ color: textMuted }}>{personal?.idIssueDate ? dayjs(personal.idIssueDate).format('DD/MM/YYYY') : '—'}</Text>
            </Descriptions.Item>
            <Descriptions.Item label={<Text style={{ color: textMuted }}>Nơi cấp</Text>}>
              <Text style={{ color: textPrimary }}>{personal?.idIssuePlace ?? '—'}</Text>
            </Descriptions.Item>
          </Descriptions>
        </div>

        <div style={{ ...cardStyle, marginTop: 16 }}>
          <Text strong style={{ color: textPrimary, display: 'block', marginBottom: 14, fontSize: 14 }}>Địa chỉ & Tài khoản ngân hàng</Text>
          <Descriptions column={1} size="small">
            <Descriptions.Item label={<Text style={{ color: textMuted }}>Địa chỉ thường trú</Text>}>
              <Text style={{ color: textPrimary }}>{personal?.permanentAddress ?? '—'}</Text>
            </Descriptions.Item>
            <Descriptions.Item label={<Text style={{ color: textMuted }}>Địa chỉ hiện tại</Text>}>
              <Text style={{ color: textPrimary }}>{personal?.currentAddress ?? '—'}</Text>
            </Descriptions.Item>
            <Descriptions.Item label={<Text style={{ color: textMuted }}>Ngân hàng</Text>}>
              <Text style={{ color: textPrimary }}>{personal?.bankName ?? '—'}</Text>
            </Descriptions.Item>
            <Descriptions.Item label={<Text style={{ color: textMuted }}>Số tài khoản</Text>}>
              <Text style={{ color: textPrimary }}>{personal?.bankAccount ?? '—'}</Text>
            </Descriptions.Item>
          </Descriptions>
        </div>
      </Col>

      {/* Thuế & Cư trú */}
      <Col xs={24} md={12}>
        <div style={cardStyle}>
          <Text strong style={{ color: textPrimary, display: 'block', marginBottom: 14, fontSize: 14 }}>Thuế & Cư trú</Text>
          <Descriptions column={1} size="small">
            <Descriptions.Item label={<Text style={{ color: textMuted }}>Mã số thuế (MST)</Text>}>
              <Text style={{ color: textPrimary }}>{personal?.taxInfo?.taxId ?? '—'}</Text>
            </Descriptions.Item>
            <Descriptions.Item label={<Text style={{ color: textMuted }}>Trạng thái cư trú thuế</Text>}>
              <Text style={{ color: textPrimary }}>{personal?.taxInfo?.residencyStatus === 'RESIDENT' ? 'Cư trú' : personal?.taxInfo?.residencyStatus === 'NON_RESIDENT' ? 'Không cư trú' : '—'}</Text>
            </Descriptions.Item>
            <Descriptions.Item label={<Text style={{ color: textMuted }}>Vùng lương tối thiểu</Text>}>
              <Text style={{ color: textPrimary }}>{personal?.taxInfo?.wageZone ? `Vùng ${personal.taxInfo.wageZone}` : '—'}</Text>
            </Descriptions.Item>
          </Descriptions>
        </div>
      </Col>

      {/* Liên hệ khẩn cấp & Y tế */}
      <Col xs={24} md={12}>
        <div style={cardStyle}>
          <Text strong style={{ color: textPrimary, display: 'block', marginBottom: 14, fontSize: 14 }}>Liên hệ khẩn cấp & Y tế</Text>
          <Descriptions column={1} size="small">
            <Descriptions.Item label={<Text style={{ color: textMuted }}>Người liên hệ khẩn cấp</Text>}>
              <Text style={{ color: textPrimary }}>{personal?.emergencyContactName ?? '—'}{personal?.emergencyContactRelation ? <Text style={{ color: textMuted }}> ({personal.emergencyContactRelation})</Text> : null}</Text>
            </Descriptions.Item>
            <Descriptions.Item label={<Text style={{ color: textMuted }}>SĐT khẩn cấp</Text>}>
              {personal?.emergencyContactPhone
                ? <a href={`tel:${personal.emergencyContactPhone}`} style={{ color: linkColor }}>{personal.emergencyContactPhone}</a>
                : <Text style={{ color: textMuted }}>—</Text>}
            </Descriptions.Item>
            <Descriptions.Item label={<Text style={{ color: textMuted }}>SĐT phụ</Text>}>
              <Text style={{ color: textPrimary }}>{personal?.secondaryPhone ?? '—'}</Text>
            </Descriptions.Item>
            <Descriptions.Item label={<Text style={{ color: textMuted }}>Nhóm máu</Text>}>
              <Text style={{ color: textPrimary }}>{personal?.bloodType ?? '—'}</Text>
            </Descriptions.Item>
            <Descriptions.Item label={<Text style={{ color: textMuted }}>Tình trạng sức khỏe</Text>}>
              <Text style={{ color: textPrimary }}>{personal?.healthNote ?? '—'}</Text>
            </Descriptions.Item>
            <Descriptions.Item label={<Text style={{ color: textMuted }}>Người giám hộ</Text>}>
              <Text style={{ color: textPrimary }}>{personal?.guardianName ?? '—'}</Text>
            </Descriptions.Item>
          </Descriptions>
        </div>
      </Col>
    </Row>
  );
}
