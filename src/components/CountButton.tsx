import { Pressable, StyleSheet, Text } from 'react-native';

import { useAppTheme } from '../context/ThemeContext';

interface Props {
  symbol: '+' | '−';
  onPress: () => void;
  disabled?: boolean;
}

export function CountButton({ symbol, onPress, disabled }: Props) {
  const { colors } = useAppTheme();
  const isPlus = symbol === '+';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      testID={isPlus ? 'count-increment' : 'count-decrement'}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: isPlus ? colors.primary : colors.surface,
          borderColor: colors.border,
          opacity: disabled ? 0.4 : pressed ? 0.8 : 1,
        },
      ]}
    >
      <Text style={[styles.symbol, { color: isPlus ? '#fff' : colors.text }]}>{symbol}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  symbol: { fontSize: 32, fontWeight: '700', lineHeight: 34 },
});
