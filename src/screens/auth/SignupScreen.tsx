import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';
import type { AuthStackParamList } from '../../navigation/types';

export function SignupScreen() {
  const { colors } = useAppTheme();
  const { signUp } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList, 'Signup'>>();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSignup() {
    setError(null);
    setInfo(null);

    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    const { error: signUpError } = await signUp(email.trim(), password);
    setSubmitting(false);

    if (signUpError) {
      setError(signUpError);
      return;
    }
    setInfo('Account created. If email confirmation is enabled, check your inbox before logging in.');
  }

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        <Text style={[styles.title, { color: colors.text }]}>Create account</Text>

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          keyboardType="email-address"
          style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]}
          testID="signup-email"
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]}
          testID="signup-password"
        />
        <TextInput
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Confirm password"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]}
          testID="signup-confirm-password"
        />

        {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
        {info ? <Text style={[styles.info, { color: colors.success }]}>{info}</Text> : null}

        <Pressable
          onPress={handleSignup}
          disabled={submitting}
          style={[styles.button, { backgroundColor: colors.primary, opacity: submitting ? 0.6 : 1 }]}
          testID="signup-submit"
        >
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign up</Text>}
        </Pressable>

        <Pressable onPress={() => navigation.navigate('Login')} style={styles.linkButton}>
          <Text style={[styles.link, { color: colors.primary }]}>Already have an account? Log in</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 12 },
  title: { fontSize: 28, fontWeight: '800', textAlign: 'center', marginBottom: 16 },
  input: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  error: { fontSize: 13, textAlign: 'center' },
  info: { fontSize: 13, textAlign: 'center' },
  button: { borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  linkButton: { marginTop: 16, alignItems: 'center' },
  link: { fontSize: 14 },
});
