import { LICENSE_LIMIT, LICENSE_TYPE } from 'src/helpers/license.helper';
import { Terms } from '../types';
import { BASIC_PLAN_TERMS, BUSINESS_PLAN_TERMS, ENTERPRISE_PLAN_TERMS } from './PlanTerms';

export default class OrganizationLicense {
  private _appsCount: number | string;
  private _workspaceId: string;
  private _tablesCount: number | string;
  private _usersCount: number | string;
  private _isAuditLogs: boolean;
  private _maxDurationForAuditLogs: number | string;
  private _isOidc: boolean;
  private _isLdap: boolean;
  private _isSAML: boolean;
  private _isCustomStyling: boolean;
  private _isWhiteLabelling: boolean;
  private _isMultiEnvironment: boolean;
  private _isMultiPlayerEdit: boolean;
  private _isComments: boolean;
  private _isGitSync: boolean;
  private _startDate: Date;
  private _expiryDate: Date;
  private _updatedDate: Date;
  private _editorUsersCount: number | string;
  private _viewerUsersCount: number | string;
  private _superadminUsersCount: number | string;
  private _isLicenseValid: boolean;
  private _workspacesCount: number | string;
  private _domainsList: Array<{ hostname?: string; subpath?: string }>;
  private _type: string;
  private _metaData: object;

  constructor(licenseData: Terms, licenseStartDate: Date, expiryDate: Date) {
    if (process.env.NODE_ENV !== 'test') {
      if (!licenseData) {
        this._isLicenseValid = false;
        this._type = LICENSE_TYPE.BASIC;
        return;
      }

      try {
        if (!licenseData?.expiry) {
          throw new Error('Invalid License Key:expiry not found');
        }

        this._appsCount = licenseData?.apps;
        this._usersCount = licenseData?.users?.total;
        this._tablesCount = licenseData?.database?.table;
        this._editorUsersCount = licenseData?.users?.editor;
        this._viewerUsersCount = licenseData?.users?.viewer;
        this._superadminUsersCount = licenseData?.users?.superadmin;
        this._isAuditLogs = licenseData?.features?.auditLogs === false ? false : true;
        this._maxDurationForAuditLogs =
          licenseData?.features?.auditLogs !== false ? licenseData?.auditLogs?.maximumDays : 0;
        this._isOidc = licenseData?.features?.oidc === false ? false : true;
        this._isLdap = licenseData?.features?.ldap === false ? false : true;
        this._isSAML = licenseData?.features?.saml === false ? false : true;
        this._isCustomStyling = licenseData?.features?.customStyling === false ? false : true;
        this._isWhiteLabelling = licenseData?.features?.whiteLabelling === false ? false : true;
        this._isMultiEnvironment = licenseData?.features?.multiEnvironment === false ? false : true;
        this._isMultiPlayerEdit = licenseData?.features?.multiPlayerEdit === false ? false : true;
        this._isComments = licenseData?.features?.comments === false ? false : true;
        this._isGitSync = licenseData?.features?.gitSync === false ? false : true;
        this._startDate = licenseStartDate;
        this._expiryDate = expiryDate;
        this._workspaceId = licenseData?.workspaceId;
        this._isLicenseValid = true;
        this._workspacesCount = licenseData?.workspaces;
        this._type = licenseData?.type;
        this._domainsList = licenseData?.domains;
        this._metaData = licenseData?.meta;
      } catch (err) {
        console.error('Invalid License Key:Parse error', err);
        this._isLicenseValid = false;
        this._type = LICENSE_TYPE.BASIC;
      }
    } else {
      const now = new Date();
      this._startDate = now;
      now.setMinutes(now.getMinutes() + 30);
      // Setting expiry 30 minutes
      this._expiryDate = now;
      this._isAuditLogs = true;
      this._isOidc = true;
      this._isLdap = true;
      this._isCustomStyling = true;
      this._isWhiteLabelling = true;
      this._isLicenseValid = true;
      this._isMultiEnvironment = true;
      this._isGitSync = true;
    }
  }

  public get isExpired(): boolean {
    return this._expiryDate && new Date().getTime() > this._expiryDate.getTime();
  }

  public get isValid(): boolean {
    return this._isLicenseValid;
  }

  public get apps(): number | string {
    if (this.IsBasicPlan) {
      return BASIC_PLAN_TERMS.apps || this._appsCount || LICENSE_LIMIT.UNLIMITED;
    }
    return this._appsCount || LICENSE_LIMIT.UNLIMITED;
  }

  public get tables(): number | string {
    if (this.IsBasicPlan) {
      return BASIC_PLAN_TERMS.database?.table || this._tablesCount || LICENSE_LIMIT.UNLIMITED;
    }
    return this._tablesCount || LICENSE_LIMIT.UNLIMITED;
  }

  public get maxDurationForAuditLogs(): number | string {
    if (this.IsBasicPlan) {
      return BASIC_PLAN_TERMS.auditLogs?.maximumDays || 0;
    }
    const maxDuration =
      typeof this._maxDurationForAuditLogs === 'string'
        ? parseInt(this._maxDurationForAuditLogs, 10)
        : this._maxDurationForAuditLogs;

    if (this.licenseType != LICENSE_TYPE.BUSINESS) {
      return maxDuration <= ENTERPRISE_PLAN_TERMS.auditLogs.maximumDays
        ? maxDuration
        : ENTERPRISE_PLAN_TERMS.auditLogs.maximumDays;
    } else {
      return maxDuration <= BUSINESS_PLAN_TERMS.auditLogs.maximumDays
        ? maxDuration
        : BUSINESS_PLAN_TERMS.auditLogs.maximumDays;
    }
  }

  public get users(): number | string {
    if (this.IsBasicPlan) {
      return BASIC_PLAN_TERMS.users?.total || this._usersCount || LICENSE_LIMIT.UNLIMITED;
    }
    return this._usersCount || LICENSE_LIMIT.UNLIMITED;
  }

  public get gitSync(): boolean {
    if (this.IsBasicPlan) {
      return !!BASIC_PLAN_TERMS.features?.gitSync;
    }
    return this._isGitSync;
  }

  public get editorUsers(): number | string {
    if (this.IsBasicPlan) {
      return BASIC_PLAN_TERMS.users?.editor || this._editorUsersCount || LICENSE_LIMIT.UNLIMITED;
    }
    return this._editorUsersCount || LICENSE_LIMIT.UNLIMITED;
  }

  public get viewerUsers(): number | string {
    if (this.IsBasicPlan) {
      return BASIC_PLAN_TERMS.users?.viewer || this._viewerUsersCount || LICENSE_LIMIT.UNLIMITED;
    }
    return this._viewerUsersCount || LICENSE_LIMIT.UNLIMITED;
  }

  public get superadminUsers(): number | string {
    if (this.IsBasicPlan) {
      return BASIC_PLAN_TERMS.users?.superadmin || this._superadminUsersCount || LICENSE_LIMIT.UNLIMITED;
    }
    return this._superadminUsersCount || LICENSE_LIMIT.UNLIMITED;
  }

  public get workspaces(): number | string {
    if (this.IsBasicPlan) {
      return BASIC_PLAN_TERMS.workspaces || this._workspacesCount || LICENSE_LIMIT.UNLIMITED;
    }
    return this._workspacesCount || LICENSE_LIMIT.UNLIMITED;
  }

  public get workspaceId(): string {
    return this._workspaceId;
  }

  public get domains(): Array<{ hostname?: string; subpath?: string }> {
    if (this.IsBasicPlan) {
      return BASIC_PLAN_TERMS.domains || this._domainsList || [];
    }
    return this._domainsList || [];
  }

  public get auditLogs(): boolean {
    if (this.IsBasicPlan) {
      return !!BASIC_PLAN_TERMS.features?.auditLogs;
    }
    return this._isAuditLogs;
  }

  public get oidc(): boolean {
    if (this.IsBasicPlan) {
      return !!BASIC_PLAN_TERMS.features?.oidc;
    }
    return this._isOidc;
  }

  public get ldap(): boolean {
    if (this.IsBasicPlan) {
      return !!BASIC_PLAN_TERMS.features?.ldap;
    }
    return this._isLdap;
  }

  public get saml(): boolean {
    if (this.IsBasicPlan) {
      return !!BASIC_PLAN_TERMS.features?.saml;
    }
    return this._isSAML;
  }

  public get multiEnvironment(): boolean {
    if (this.IsBasicPlan) {
      return !!BASIC_PLAN_TERMS.features?.multiEnvironment;
    }
    return this._isMultiEnvironment;
  }

  public get customStyling(): boolean {
    if (this.IsBasicPlan) {
      return !!BASIC_PLAN_TERMS.features?.customStyling;
    }
    return this._isCustomStyling;
  }

  public get whiteLabelling(): boolean {
    if (this.IsBasicPlan) {
      return !!BASIC_PLAN_TERMS.features?.whiteLabelling;
    }
    return this._isWhiteLabelling;
  }

  public get multiPlayerEdit(): boolean {
    if (this.IsBasicPlan) {
      return !!BASIC_PLAN_TERMS.features?.multiPlayerEdit;
    }
    return this._isMultiPlayerEdit;
  }

  public get comments(): boolean {
    if (this.IsBasicPlan) {
      return !!BASIC_PLAN_TERMS.features?.comments;
    }
    return this._isComments;
  }

  public get updatedAt(): Date {
    return this._updatedDate;
  }

  public get licenseType(): string {
    return this._type || LICENSE_TYPE.ENTERPRISE;
  }

  public get features(): object {
    return {
      openid: this.oidc,
      auditLogs: this.auditLogs,
      ldap: this.ldap,
      saml: this.saml,
      customStyling: this.customStyling,
      whiteLabelling: this.whiteLabelling,
      multiEnvironment: this.multiEnvironment,
      multiPlayerEdit: this.multiPlayerEdit,
      comments: this.comments,
      gitSync: this.gitSync,
    };
  }

  public get expiry(): Date {
    return this._expiryDate;
  }

  public get startDate(): Date {
    return this._startDate;
  }

  public get metaData(): object {
    return this._metaData;
  }

  public get terms(): object {
    return {
      appsCount: this.apps,
      tablesCount: this.tables,
      usersCount: this.users,
      auditLogsEnabled: this.auditLogs,
      maxDurationForAuditLogs: this.maxDurationForAuditLogs,
      oidcEnabled: this.oidc,
      ldapEnabled: this.ldap,
      samlEnabled: this.saml,
      customStylingEnabled: this.customStyling,
      multiEnvironmentEnabled: this.multiEnvironment,
      multiPlayerEditEnabled: this.multiPlayerEdit,
      commentsEnabled: this.comments,
      startDate: this._startDate,
      expiryDate: this._expiryDate,
      isExpired: this.isExpired,
      isLicenseValid: this._isLicenseValid,
      editorUsers: this.editorUsers,
      viewerUsers: this.viewerUsers,
      workspacesCount: this.workspaces,
    };
  }

  private get IsBasicPlan(): boolean {
    return !this.isValid || this.isExpired;
  }
}
