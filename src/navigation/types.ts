import type { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
};

export type InventoryStackParamList = {
  InventoryList: undefined;
  ItemDetail: { itemId: string };
  CreateEditItem: { itemId?: string; prefillBarcode?: string } | undefined;
  BarcodeScanner: { mode: 'lookup' | 'assign' } | undefined;
};

export type MainTabParamList = {
  InventoryTab: NavigatorScreenParams<InventoryStackParamList>;
  Settings: undefined;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
