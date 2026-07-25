import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { useAppTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { getQueueLength, flushQueue } from '../offline/syncQueue';

export function SettingsScreen() {
  const { colors, scheme, toggleTheme } = useAppTheme();
  const { user, signOut } = useAuth();
  const { isOnline } = useNetworkStatus();
  const [pendingOps, setPendingOps] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getQueueLength().then(setPendingOps);
    }, [])
  );

  async function handleForceSync() {
    setSyncing(true);
    await flushQueue();
    setPendingOps(await getQueueLength());
    setSyncing(false);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Settings</Text>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.cardLabel, { color: colors.textMuted }]}>Signed in as</Text>
        <Text style={{ color: colors.text, fontSize: 15 }}>{user?.email}</Text>
      </View>

      <View style={[styles.row, styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={{ color: colors.text, fontSize: 15 }}>Dark mode</Text>
        <Switch value={scheme === 'dark'} onValueChange={toggleTheme} testID="theme-switch" />
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.row}>
          <Text style={{ color: colors.text, fontSize: 15 }}>Connection</Text>
          <View style={[styles.statusDot, { backgroundColor: isOnline ? colors.success : colors.danger }]} />
        </View>
        <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 4 }}>
          {pendingOps} pending change{pendingOps === 1 ? '' : 's'} waiting to sync
        </Text>
        {pendingOps > 0 && isOnline ? (
          <Pressable onPress={handleForceSync} disabled={syncing} style={[styles.syncButton, { backgroundColor: colors.primary }]}>
            <Text style={{ color: '#fff', fontWeight: '600' }}>{syncing ? 'Syncing…' : 'Sync now'}</Text>
          </Pressable>
        ) : null}
      </View>

      <Pressable onPress={signOut} style={[styles.signOut, { borderColor: colors.danger }]} testID="sign-out">
        <Text style={{ color: colors.danger, fontWeight: '600' }}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 16 },
  title: { fontSize: 26, fontWeight: '800', marginBottom: 8 },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 16, gap: 4 },
  cardLabel: { fontSize: 12, textTransform: 'uppercase', fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  syncButton: { marginTop: 10, alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  signOut: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 8 },
});
