// "Poner alarma": abre la app de reloj con la hora puesta (intent SET_ALARM). Es el único
// código de intents de la app. Necesita `com.android.alarm.permission.SET_ALARM` en
// app.json, que es un permiso normal: no sale ningún aviso.

import { startActivityAsync } from 'expo-intent-launcher';

/**
 * `startActivityAsync` usa `startActivityForResult` y su promesa no resuelve hasta volver
 * a la app: no se espera para nada de la interfaz. Solo importa si falla (en Expo Go, siempre:
 * no tiene el permiso).
 * Si el reloj de la vez anterior aún no ha devuelto su resultado, el módulo rechaza con
 * E_ACTIVITY_ALREADY_STARTED: eso no es un fallo y se ignora.
 * Los números llegan al intent como Int (IntentLauncherModule.kt convierte Double → Int).
 */
export function ponerAlarma(minutos: number, siFalla: () => void) {
  startActivityAsync('android.intent.action.SET_ALARM', {
    extra: {
      'android.intent.extra.alarm.HOUR': Math.floor(minutos / 60),
      'android.intent.extra.alarm.MINUTES': minutos % 60,
      'android.intent.extra.alarm.MESSAGE': 'CAtFFEINE',
    },
  }).catch((e: { code?: string }) => {
    if (e?.code !== 'E_ACTIVITY_ALREADY_STARTED') siFalla();
  });
}
