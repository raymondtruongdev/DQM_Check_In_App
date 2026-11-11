import * as React from 'react';
import { RoleEntry } from '../../../core/types';
import { Icon } from '../../../core/components/Icon';

export interface INoAccessStateProps {
  userEmail: string;
  allRoles?: RoleEntry[];
  onRefresh?: () => void;
}

export const NoAccessState: React.FC<INoAccessStateProps> = ({
  userEmail,
  onRefresh
}) => {
  return (
    <div className="report-noaccess">
      <div className="report-noaccess-icon">
        <Icon name="error-circle" size={28} />
      </div>
      <h3 className="report-noaccess-title">Chưa được phân quyền quản lý báo cáo</h3>
      <p className="report-noaccess-text">
        Tài khoản <strong>{userEmail || 'của bạn'}</strong> chưa được phân công báo cáo (DailyReport / WeeklyReport) trong <code>Report_Role</code> hoặc (Status = FALSE).
      </p>
      <p className="report-noaccess-hint">
        Vui lòng liên hệ Quản trị viên để phân quyền trong SharePoint
      </p>
      {onRefresh && (
        <button type="button" onClick={onRefresh} className="btn btn--primary">
          <Icon name="refresh" />
          <span>Kiểm tra lại quyền</span>
        </button>
      )}
    </div>
  );
};
