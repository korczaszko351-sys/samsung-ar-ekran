import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

export default function RootLayout() {
  const scheme = useColorScheme();
  return (
    <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="projector" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="screen-editor" options={{ title: 'Plansza', presentation: 'modal' }} />
        <Stack.Screen name="+not-found" options={{ title: 'Nie znaleziono' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
