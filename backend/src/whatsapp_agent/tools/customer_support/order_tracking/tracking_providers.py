from typing import Any, Dict
import requests
from whatsapp_agent.schema.tracking import TrackingResponse, TrackingEvent
from whatsapp_agent.utils.config import Config

def track_postex(tracking_no: str) -> Dict[str, Any]:
	"""Track package using Postex API
	
	Args:
		tracking_no: The tracking number to look up
		
	Returns:
		A dictionary containing tracking information or error details
	"""
	
	try:
		url = f"https://api.postex.pk/services/integration/api/order/v1/track-order/{tracking_no}"
		
		headers = {
			"Content-Type": "application/json",
			"token": Config.get("POSTEX_API_TOKEN")
		}
		
		response = requests.get(url, headers=headers)
		response.raise_for_status()
		
		data = response.json()
		
		# Check response status based on actual API response format
		if data.get("statusCode") == "200":
			tracking_data = data.get("dist", {})
			# Build events from full transaction history
			transaction_history = tracking_data.get("transactionStatusHistory", []) or []
			events: TrackingResponse.delivery_events = []
			if isinstance(transaction_history, list):
				for item in transaction_history:
					if not isinstance(item, dict):
						continue
					status_msg = item.get("transactionStatusMessage")
					status_code = item.get("transactionStatusMessageCode")
					updated_at = item.get("updatedAt")
					detail_text = f"Code: {status_code}" if status_code else None
					events.append(
						TrackingEvent(
							parcel_status=status_msg,
							activity_date=updated_at,
							details=detail_text,
						)
					)
			
			# Determine current status, prefer explicit field; fallback to latest event
			current_status = tracking_data.get("transactionStatus")
			if not current_status and len(events) > 0:
				current_status = events[-1].status
			
			response_model = TrackingResponse(
				result="success",
				courier="Postex",
				tracking_number=tracking_data.get("trackingNumber") or tracking_no,
				current_status=current_status,
				customer_name=tracking_data.get("customerName"),
				customer_phone=tracking_data.get("customerPhone"),
				delivery_address=tracking_data.get("deliveryAddress"),
				merchant_name=tracking_data.get("merchantName"),
				destination_city=tracking_data.get("cityName"),
				pickup_date=tracking_data.get("orderPickupDate"),
				delivery_date=tracking_data.get("orderDeliveryDate"),
				order_detail=tracking_data.get("orderDetail"),
				delivery_events=events,
			)
			return response_model.model_dump()
		else:
			return TrackingResponse(
				result="failed",
				courier="Postex",
				tracking_number=tracking_no,
				error=f"Postex API error: {data.get('statusMessage', 'Unknown error')}",
				provider_payload=data
			).model_dump()
			
	except requests.RequestException as e:
		return TrackingResponse(
			result="failed",
			courier="Postex",
			tracking_number=tracking_no,
			error=f"Postex API request failed: {str(e)}"
		).model_dump()


def track_leopards(tracking_no: str) -> Dict[str, Any]:
	"""Track package using Leopards Courier API
	
	Args:
		tracking_no: The tracking number to track
		
	Returns:
		A dictionary containing tracking information or error details
	"""

	try:
		url = "https://merchantapi.leopardscourier.com/api/trackBookedPacket/format/json/"
		
		params = {
			'api_key': Config.get("LEOPARDS_API_KEY"),
			'api_password': Config.get("LEOPARDS_API_PASSWORD"),
			'track_numbers': tracking_no
		}
		
		response = requests.post(url, data=params)
		response.raise_for_status()
		
		data = response.json()
		
		# Process response
		if data.get('status') == 1 and data.get('error') == 0:
			packets = data.get('packet_list', [])
			# Extract first packet matching tracking number (API supports multiple)
			first_packet = packets[0] if packets else {}
			# Map tracking details to unified events
			tracking_details = first_packet.get('Tracking Detail', [])
			events = [
				TrackingEvent(
					parcel_status=item.get('Status'),
					receiver_name=item.get('Reciever_Name'),
					activity_date=item.get('Activity_datetime'),
					reason=item.get('Reason'),
				)
				for item in tracking_details
			]
			
			response_model = TrackingResponse(
				result="success",
				courier="Leopards Courier",
				customer_name=first_packet.get('consignment_name_eng'),
				customer_phone=first_packet.get('consignment_phone'),
				delivery_address=first_packet.get('consignment_address'),
				pickup_date=tracking_details[0].get('Activity_datetime'),
				tracking_number=first_packet.get('track_number') or tracking_no,
				current_status=first_packet.get('booked_packet_status'),
				delivery_date=tracking_details[-1].get('Activity_datetime') if (first_packet.get('booked_packet_status') == 'Delivered') else None,
				origin_city=first_packet.get('origin_city_name'),
				destination_city=first_packet.get('destination_city_name'),
				order_id=first_packet.get('booked_packet_order_id'),
				delivery_events=events,
				order_detail=first_packet.get("special_instructions"),
			)
			return response_model.model_dump()
		else:
			return TrackingResponse(
				result="failed",
				courier="Leopards Courier",
				tracking_number=tracking_no,
				error="API returned unsuccessful status",
				provider_payload=data,
			).model_dump()
			
	except requests.RequestException as e:
		return TrackingResponse(
			result="failed",
			courier="Leopards Courier",
			tracking_number=tracking_no,
			error=f"API request failed: {str(e)}",
		).model_dump()
	except ValueError as e:
		return TrackingResponse(
			result="failed",
			courier="Leopards Courier",
			tracking_number=tracking_no,
			error=str(e),
		).model_dump()
	except Exception as e:
		return TrackingResponse(
			result="failed",
			courier="Leopards Courier",
			tracking_number=tracking_no,
			error=f"Unexpected error: {str(e)}",
		).model_dump()