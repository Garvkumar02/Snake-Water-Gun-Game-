import random

youDict = {"s": 1, "w": -1, "g": 0} 
reverseDict = {1: "snake", -1: "water", 0: "gun"}

def get_winner_numeric(you, computer):
    if you == computer:
        return 'tie'
    
    if (you == 1 and computer == -1): #snake and water
        return 'win'
    elif (you == 1 and computer == 0): #snake and gun
        return 'lose'
    elif (you == -1 and computer == 0): #water and gun
        return 'win'
    elif (you == -1 and computer == 1): #water and snake
        return 'lose'
    elif (you == 0 and computer == 1): #gun and snake
        return 'win'
    elif (you == 0 and computer == -1): #gun and water
        return 'lose'
    else:
        return 'error'

if __name__ == '__main__':
    computer = random.choice([1, -1, 0]) #computer choice 
    youstr = input("enter your choice: ")
    
    if youstr in youDict:
        you = youDict[youstr] 
        
        print("you choose", reverseDict[you])
        print("computer choose", reverseDict[computer]) 
        
        result = get_winner_numeric(you, computer)
        if result == 'tie':
            print("tie!!")
        elif result == 'win':
            print("you win")
        elif result == 'lose':
            print("you lose!!")
        else:
            print("smoething went wrong!")
    else:
        print("Invalid choice!")
