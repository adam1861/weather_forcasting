# --- Fonction pour calculer les valeurs météo demandées à partir des variables physiques ---
import numpy as np

def compute_weather_fields(variables: dict) -> dict:
	# Température (°C)
	temp_c = variables.get('Air temperature', 0.0)
	temp_k = temp_c + 273.15

	# Humidité spécifique (g/kg ou kg/kg) -> Humidité relative (%)
	# On suppose que 'Specific humidity' est en g/kg, sinon adapter
	q = variables.get('Specific humidity', 0.0) / 1000  # conversion g/kg -> kg/kg
	p = variables.get('Surface pressure', 1013.0)  # hPa
	# Calcul pression de vapeur d'eau
	e = q * p / (0.622 + 0.378 * q)
	# Calcul pression de vapeur saturante
	e_sat = np.exp(13.7 - (5120 / temp_k))
	# Humidité relative (%)
	HR = 100 * e / e_sat if e_sat > 0 else 0

	# Heat Index (HI) (°C)
	T_F = temp_c * 9/5 + 32  # conversion en °F
	HI_F = (-42.379 + 2.04901523*T_F + 10.14333127*HR - 0.22475541*T_F*HR
			- 0.00683783*T_F**2 - 0.05481717*HR**2 + 0.00122874*T_F**2*HR
			+ 0.00085282*T_F*HR**2 - 0.00000199*T_F**2*HR**2)
	HI_C = (HI_F - 32) * 5/9 if temp_c >= 27 else temp_c  # HI seulement si chaud

	# Vent (m/s) et Rafales (m/s)
	wind_speed = variables.get('Wind speed', 0.0)
	# Si u/v disponibles, calcul vectoriel
	u = variables.get('u_wind', wind_speed)
	v = variables.get('v_wind', 0.0)
	wind = np.sqrt(u**2 + v**2)
	gusts = wind * 1.5  # estimation simple

	# Pression (hPa)
	pressure = p

	# Probabilités météo (%) (exemple: pluie, neige, soleil, orage)
	# Ici, on simule avec les variables disponibles
	rain_prob = min(100, int(variables.get('Rain precipitation rate', 0.0) * 100))
	snow_prob = min(100, int(variables.get('Snow precipitation rate', 0.0) * 100))
	sunny_prob = max(0, 100 - int(variables.get('Albedo', 0.0) * 10))
	storm_prob = min(100, int(wind * 10))

	return {
		'Température (°C)': round(temp_c, 1),
		'Ressenti (°C)': round(HI_C, 1),
		'Vent (m/s)': round(wind, 1),
		'Rafales (m/s)': round(gusts, 1),
		'Humidité (%)': round(HR, 1),
		'Pression (hPa)': round(pressure, 1),
		'Probabilité pluie (%)': rain_prob,
		'Probabilité neige (%)': snow_prob,
		'Probabilité soleil (%)': sunny_prob,
		'Probabilité orage (%)': storm_prob
	}
