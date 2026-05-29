export interface DerivTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  
  // Custom or legacy response mappings if returned
  [key: string]: any;
}

export interface DerivAccount {
  account_category: string;
  account_type: string;
  currency: string;
  is_virtual: number | boolean;
  loginid: string;
  balance?: number | string;
}

export interface DerivAuthorizeDetails {
  email: string;
  fullname: string;
  currency: string;
  balance: string;
  scopes: string[];
  account_list: DerivAccount[];
  landing_company_name: string;
  country: string;
  loginid?: string;
  is_virtual?: number | boolean;
}

export interface WebSocketMessage {
  msg_type: string;
  echo_req: Record<string, any>;
  authorize?: DerivAuthorizeDetails;
  error?: {
    code: string;
    message: string;
  };
  [key: string]: any;
}
