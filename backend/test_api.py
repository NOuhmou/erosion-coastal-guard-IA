import unittest
from unittest.mock import patch, MagicMock
from app import app
import json

class CoastalGuardApiTest(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    @patch('app.get_db_connection')
    def test_status_endpoint(self, mock_conn):
        # Setup mock
        mock_conn.return_value = MagicMock()
        
        response = self.app.get('/api/status')
        data = json.loads(response.data)
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data['system'], "Coastal Guard IA")
        self.assertEqual(data['database'], "Connected")

    @patch('app.get_db_connection')
    def test_kpi_endpoint(self, mock_conn):
        # Setup mock cursor
        mock_cursor = MagicMock()
        mock_cursor.fetchone.side_effect = [
            {'avg': 1.5},    # recul_moyen
            {'count': 3},    # zones_rouges
            {'count': 100},  # total_points
            {'count': 5}     # non_constructibles
        ]
        
        mock_db = MagicMock()
        mock_db.cursor.return_value.__enter__.return_value = mock_cursor
        mock_conn.return_value = mock_db
        
        response = self.app.get('/api/kpi')
        data = json.loads(response.data)
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data['recul_moyen'], 1.5)
        self.assertEqual(data['points_gps'], 100)

    @patch('app.get_db_connection')
    def test_permit_rejection_logic(self, mock_conn):
        # Simulate the database returning a 'REFUSE' status due to trigger logic
        mock_cursor = MagicMock()
        mock_cursor.fetchone.return_value = {
            'id_demande': 'uuid-123',
            'statut': 'REFUSE',
            'motif_blocage': 'Interdiction légale (Loi 81-12)'
        }
        
        mock_db = MagicMock()
        mock_db.cursor.return_value.__enter__.return_value = mock_cursor
        mock_conn.return_value = mock_db
        
        payload = {
            "id_demandeur": "user-uuid",
            "id_zone": "zone-uuid",
            "id_parcelle": "parcelle-uuid",
            "nom_projet": "Hotel Beach",
            "distance_trait_cote_m": 45.0 # < 100m
        }
        
        response = self.app.post('/api/permits', 
                                 data=json.dumps(payload),
                                 content_type='application/json')
        
        data = json.loads(response.data)
        self.assertEqual(response.status_code, 403)
        self.assertEqual(data['decision'], 'REFUSE')

    @patch('app.get_db_connection')
    def test_points_carte_endpoint(self, mock_conn):
        mock_cursor = MagicMock()
        mock_cursor.fetchall.return_value = [
            {
                'id_point': 'p1',
                'nom_point': 'Point A',
                'latitude': 30.5,
                'longitude': -9.6,
                'nom_zone': 'Agadir',
                'dernier_recul': 2.5
            }
        ]
        
        mock_db = MagicMock()
        mock_db.cursor.return_value.__enter__.return_value = mock_cursor
        mock_conn.return_value = mock_db
        
        response = self.app.get('/api/points-carte')
        data = json.loads(response.data)
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['nom_point'], 'Point A')

if __name__ == '__main__':
    unittest.main()
