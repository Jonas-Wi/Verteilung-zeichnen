import random
import math

def generate_w1_normalverteilung():
	"""
	Erzeugt eine Zahlenverteilung (0-20) für Welt 1.

	Anforderungen:
	- Der Hochpunkt (mu) ist zufällig zwischen 1 und 20.
	- Die Verteilung nutzt nur 3 mögliche Werte (mu-1, mu, mu+1), passend zur Einsteiger-Stufe.
	- Die Anzahl N wird hier festgelegt und bleibt für alle Klassen konsistent.
	"""
	# N hier zentral festlegen, damit es über alle Klassen gleich bleibt
	N = 10
	mu = random.randint(1, 20)
	sigma = random.uniform(0.3, 1.5)
	values = []
	for _ in range(N):
		u1 = random.random()
		u2 = random.random()
		z = math.sqrt(-2 * math.log(u1 + 1e-8)) * math.cos(2 * math.pi * u2)
		v = mu + z * sigma
		# Auf die 3 Werte um den Hochpunkt runden und clampen
		v = int(round(v))
		v = max(mu - 1, min(mu + 1, v))
		# Clamp auf 1-20, falls mu nahe am Rand
		v = max(1, min(20, v))
		values.append(v)
	return values
